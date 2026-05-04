import { defineEventHandler, createError } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { buildCityWhereClause, getCanonicalCityName, isCityCode } from '../../utils/city-dictionary'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


// City coordinates for major Alberta cities
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Calgary': { latitude: 51.0447, longitude: -114.0719 },
  'Edmonton': { latitude: 53.5461, longitude: -113.4938 },
  'Red Deer': { latitude: 52.2681, longitude: -113.8112 },
  'Lethbridge': { latitude: 49.7016, longitude: -112.8186 },
  'Medicine Hat': { latitude: 50.0436, longitude: -110.6764 },
  'Grande Prairie': { latitude: 55.1708, longitude: -118.8024 },
  'Airdrie': { latitude: 51.2917, longitude: -114.0144 },
  'Spruce Grove': { latitude: 53.5450, longitude: -113.9108 },
  'Okotoks': { latitude: 50.7267, longitude: -113.9775 },
  'Camrose': { latitude: 53.0158, longitude: -112.8286 },
  'Lloydminster': { latitude: 53.2834, longitude: -110.0059 },
  'Canmore': { latitude: 51.0881, longitude: -115.3583 },
  'Cochrane': { latitude: 51.1944, longitude: -114.4686 },
  'Chestermere': { latitude: 51.0486, longitude: -113.8219 },
  'Sherwood Park': { latitude: 53.5158, longitude: -113.3147 },
  'St. Albert': { latitude: 53.6347, longitude: -113.6250 }
}

export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const propertyWhereBase = {
      AND: [getPublicSharedMlsWhere(tenantFilter), { status: 'for_sale' as const }],
    }

    // Get property counts grouped by raw `Property.city` value. Then we
    // canonicalise + sum the counts so "Calgary", "Calgary (NW)", and
    // any unmapped Pillar9 codes that resolve to "Calgary" collapse into
    // a single dropdown entry rather than appearing 3+ times.
    const rawCityCounts = await prisma.property.groupBy({
      by: ['city'],
      _count: { id: true },
      where: propertyWhereBase,
    })

    type Bucket = { count: number; rawValues: Set<string> }
    const bucketByCanonical = new Map<string, Bucket>()
    for (const row of rawCityCounts) {
      if (!row.city) continue
      const canonical = getCanonicalCityName(row.city)
      // Drop unknown raw numeric codes — no human label to render.
      if (!canonical || isCityCode(canonical)) continue
      const existing = bucketByCanonical.get(canonical)
      if (existing) {
        existing.count += row._count.id
        existing.rawValues.add(row.city)
      } else {
        bucketByCanonical.set(canonical, {
          count: row._count.id,
          rawValues: new Set([row.city]),
        })
      }
    }

    // Stable order: most-listings-first, matches the legacy desc orderBy.
    const cityBuckets = [...bucketByCanonical.entries()]
      .sort(([, a], [, b]) => b.count - a.count)

    // Get additional city statistics. For each canonical city we run the
    // nested aggregates against ALL its raw spellings/codes via
    // buildCityWhereClause, so the avg/min/max/types/sources reflect the
    // full inventory rather than just one of the spellings.
    const cityStats = await Promise.all(
      cityBuckets.map(async ([cityName, bucket]) => {
        const cityConditions = buildCityWhereClause(cityName)
        const cityWhere = cityConditions.length > 0
          ? { OR: cityConditions }
          // Defensive — buildCityWhereClause always returns at least a
          // contains-fallback for non-empty input, so this branch is
          // unreachable in practice. Kept so the type narrowing is clean.
          : { city: cityName }

        const baseAnd = [
          getPublicSharedMlsWhere(tenantFilter),
          cityWhere,
          { status: 'for_sale' as const },
        ]

        const stats = await prisma.property.aggregate({
          where: { AND: baseAnd },
          _avg: { price: true, sqft: true },
          _min: { price: true },
          _max: { price: true },
        })

        const typeBreakdown = await prisma.property.groupBy({
          by: ['type'],
          _count: { id: true },
          where: { AND: baseAnd },
        })

        const sourceBreakdown = await prisma.property.groupBy({
          by: ['source'],
          _count: { id: true },
          where: { AND: baseAnd },
        })

        return {
          name: cityName,
          count: bucket.count,
          province: 'Alberta', // All properties are in Alberta
          coordinates: CITY_COORDINATES[cityName] || null,
          stats: {
            avgPrice: Math.round(stats._avg.price || 0),
            minPrice: stats._min.price || 0,
            maxPrice: stats._max.price || 0,
            avgSqft: Math.round(stats._avg.sqft || 0)
          },
          propertyTypes: typeBreakdown.reduce((acc, type) => {
            acc[type.type] = type._count.id
            return acc
          }, {} as Record<string, number>),
          sources: sourceBreakdown.reduce((acc, source) => {
            acc[source.source] = source._count.id
            return acc
          }, {} as Record<string, number>)
        }
      })
    )

    // Filter out cities with very few properties (less than 5) to keep the list manageable
    const significantCities = cityStats.filter(city => city.count >= 5)

    // Sort by property count (most properties first)
    significantCities.sort((a, b) => b.count - a.count)

    console.log(`📊 Returning ${significantCities.length} cities with properties:`)
    significantCities.slice(0, 10).forEach(city => {
      console.log(`  🏙️ ${city.name}: ${city.count} properties (avg: $${city.stats.avgPrice?.toLocaleString()})`)
    })

    return significantCities
  } catch (error: any) {
    console.error('❌ Failed to fetch cities:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch cities: ${error.message}`
    })
  }
})

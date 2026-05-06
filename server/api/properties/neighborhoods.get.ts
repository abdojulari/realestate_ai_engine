import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { lookupCity } from '../../utils/city-dictionary'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/properties/neighborhoods?city=Edmonton
 *
 * Builds the dropdown from the same fallback chain MLS consumers expect:
 *   1. RESO SubdivisionName → `features.subdivisionName` (granular subdivision)
 *   2. RESO CityRegion / community → `features.cityRegion` (CREA writes CityRegion here)
 *   3. Top-level `Property.cityRegion` (CREA column mirror — often populated when
 *      subdivision is blank, e.g. Edmonton condos)
 *
 * Previously we only grouped on `features.subdivisionName`, so thousands of CREA
 * rows with CityRegion but empty SubdivisionName disappeared from the dropdown
 * (~30 subdivisions vs 7000+ listings). Pillar9 carries SubdivisionName on the
 * wire and should populate `features.subdivisionName`; we also map Matrix
 * CityRegion when the API exposes it (see pillar9.service.ts $select).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const city = (query.city as string || '').trim()
  const search = (query.search as string || '').trim()

  if (!city) {
    return { neighborhoods: [] }
  }

  const tenantFilter = await getPublicTenantFilter(event)
  const sharedMlsWhere = getPublicSharedMlsWhere(tenantFilter)

  // Build the city-match clause through the bidirectional dictionary so
  // the raw SQL covers every spelling variant + any Pillar9 codes that
  // map to the same canonical city. Falls back to the legacy ILIKE when
  // the input isn't in the dictionary so admins can still query
  // unmapped cities.
  const entry = lookupCity(city)
  const cityClause = entry
    ? Prisma.sql`(
        ${Prisma.join(
          [
            ...[entry.name, ...(entry.aliases ?? [])].map(
              n => Prisma.sql`city ILIKE ${n}`,
            ),
            ...(entry.codes.length > 0
              ? [Prisma.sql`city = ANY(${entry.codes})`]
              : []),
          ],
          ' OR ',
        )}
      )`
    : Prisma.sql`city ILIKE ${city}`

  // Single resolved "area" label per row — matches how CREA/Pillar9 expose community.
  const neighborhoodExpr = Prisma.sql`
    COALESCE(
      NULLIF(TRIM(features->>'subdivisionName'), ''),
      NULLIF(TRIM(features->>'cityRegion'), ''),
      NULLIF(TRIM("cityRegion"), '')
    )
  `

  const searchCondition = search
    ? Prisma.sql`AND COALESCE(
      NULLIF(TRIM(features->>'subdivisionName'), ''),
      NULLIF(TRIM(features->>'cityRegion'), ''),
      NULLIF(TRIM("cityRegion"), '')
    ) ILIKE ${'%' + search + '%'}`
    : Prisma.sql``

  const results = await prisma.$queryRaw<Array<{
    neighborhood_name: string
    property_count: bigint
    avg_price: number | null
    avg_lat: number | null
    avg_lng: number | null
  }>>`
    SELECT 
      ${neighborhoodExpr} AS neighborhood_name,
      COUNT(*)::bigint AS property_count,
      AVG(price) AS avg_price,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM "public"."Property"
    WHERE ${cityClause}
      AND status = 'for_sale'
      AND COALESCE(
        NULLIF(TRIM(features->>'subdivisionName'), ''),
        NULLIF(TRIM(features->>'cityRegion'), ''),
        NULLIF(TRIM("cityRegion"), '')
      ) IS NOT NULL
      AND LENGTH(TRIM(COALESCE(
        NULLIF(TRIM(features->>'subdivisionName'), ''),
        NULLIF(TRIM(features->>'cityRegion'), ''),
        NULLIF(TRIM("cityRegion"), '')
      ))) > 0
      ${searchCondition}
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 200
  `

  const neighborhoods = results.map((r, index) => ({
    id: index + 1,
    name: r.neighborhood_name,
    city,
    propertyCount: Number(r.property_count),
    averagePrice: r.avg_price ? Math.round(r.avg_price) : null,
    centerLatitude: r.avg_lat,
    centerLongitude: r.avg_lng
  }))

  return {
    neighborhoods,
    total: neighborhoods.length
  }
})

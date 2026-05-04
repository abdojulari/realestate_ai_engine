import { defineEventHandler, createError } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { getCanonicalCityName, isCityCode } from '../../utils/city-dictionary'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const propertyWhere = { AND: [getPublicSharedMlsWhere(tenantFilter)] }

    // Group by raw `Property.city`; we then canonicalise + sum so
    // "Calgary"/"Calgary (NW)"/code variants collapse into one bucket.
    const cityStats = await prisma.property.groupBy({
      by: ['city'],
      _count: { id: true },
      where: propertyWhere,
    })

    // Get property type statistics
    const propertyTypeStats = await prisma.property.groupBy({
      by: ['type'],
      _count: {
        id: true
      },
      where: propertyWhere,
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Canonicalise + dedupe so consumers don't see "Calgary" / "Calgary (NW)"
    // / Pillar9-coded variants as separate cities.
    const countByCanonical = new Map<string, number>()
    for (const stat of cityStats) {
      if (!stat.city) continue
      const canonical = getCanonicalCityName(stat.city)
      if (!canonical || isCityCode(canonical)) continue
      countByCanonical.set(canonical, (countByCanonical.get(canonical) ?? 0) + stat._count.id)
    }
    const cities = [...countByCanonical.entries()]
      .map(([city, propertyCount]) => ({ city, propertyCount }))
      .sort((a, b) => b.propertyCount - a.propertyCount)

    const propertyTypes = propertyTypeStats.map(stat => ({
      type: stat.type,
      count: stat._count.id
    }))

    // Calculate summary statistics
    const totalProperties = cities.reduce((sum, city) => sum + city.propertyCount, 0)
    const totalCities = cities.length
    const avgPropertiesPerCity = Math.round(totalProperties / totalCities)

    return {
      cities,
      propertyTypes,
      summary: {
        totalCities,
        totalProperties,
        avgPropertiesPerCity,
        majorMarkets: cities.filter(c => c.propertyCount >= 1000).length,
        mediumMarkets: cities.filter(c => c.propertyCount >= 100 && c.propertyCount < 1000).length,
        smallMarkets: cities.filter(c => c.propertyCount < 100).length
      }
    }
  } catch (error) {
    console.error('Error fetching city statistics:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch city statistics'
    })
  }
})

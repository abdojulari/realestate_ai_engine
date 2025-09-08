import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    // Get property counts grouped by city
    const cityCounts = await prisma.property.groupBy({
      by: ['city'],
      _count: {
        id: true
      },
      where: {
        status: 'for_sale'
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Get additional city statistics
    const cityStats = await Promise.all(
      cityCounts.map(async (cityGroup) => {
        const cityName = cityGroup.city
        const count = cityGroup._count.id

        // Get average price and property types for this city
        const stats = await prisma.property.aggregate({
          where: {
            city: cityName,
            status: 'for_sale'
          },
          _avg: {
            price: true,
            sqft: true
          },
          _min: {
            price: true
          },
          _max: {
            price: true
          }
        })

        // Get property type breakdown
        const typeBreakdown = await prisma.property.groupBy({
          by: ['type'],
          _count: {
            id: true
          },
          where: {
            city: cityName,
            status: 'for_sale'
          }
        })

        // Get source breakdown (CREA vs Manual)
        const sourceBreakdown = await prisma.property.groupBy({
          by: ['source'],
          _count: {
            id: true
          },
          where: {
            city: cityName,
            status: 'for_sale'
          }
        })

        return {
          name: cityName,
          count,
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

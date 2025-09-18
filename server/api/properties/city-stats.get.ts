import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Get city statistics from actual property data
    const cityStats = await prisma.property.groupBy({
      by: ['city'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Transform the data
    const cities = cityStats.map(stat => ({
      city: stat.city,
      propertyCount: stat._count.id
    }))

    // Calculate summary statistics
    const totalProperties = cities.reduce((sum, city) => sum + city.propertyCount, 0)
    const totalCities = cities.length
    const avgPropertiesPerCity = Math.round(totalProperties / totalCities)

    return {
      cities,
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

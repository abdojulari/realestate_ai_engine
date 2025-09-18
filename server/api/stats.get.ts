import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Get basic public statistics
    const [totalUsers, totalProperties, totalActiveProperties] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.property.count({
        where: { 
          status: { 
            in: ['for_sale', 'for_rent', 'active'] 
          } 
        }
      })
    ])

    return {
      totalUsers,
      totalProperties,
      totalActiveProperties
    }
  } catch (error) {
    console.error('Error fetching public stats:', error)
    // Return fallback values if database query fails
    return {
      totalUsers: 0,
      totalProperties: 0,
      totalActiveProperties: 0
    }
  }
})

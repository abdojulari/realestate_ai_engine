import { defineEventHandler } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    // Build user filter: include admin themselves + their users
    const userWhere = tenantFilter.adminId
      ? { OR: [{ adminId: tenantFilter.adminId }, { id: tenantFilter.adminId }] }
      : {}

    // Get basic public statistics
    const [totalUsers, totalProperties, totalActiveProperties] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.property.count({ where: { AND: [getPublicSharedMlsWhere(tenantFilter)] } }),
      prisma.property.count({
        where: {
          AND: [
            getPublicSharedMlsWhere(tenantFilter),
            {
              status: {
                in: ['for_sale', 'for_rent', 'active'],
              },
            },
          ],
        },
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

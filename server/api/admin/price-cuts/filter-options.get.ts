import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Returns distinct cities, communities/regions, and property types
 * for the current tenant's properties so the UI can show dropdowns.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)

    const where: any = {
      ...tenantFilter,
      status: { in: ['for_sale', 'pending'] },
    }

    // Fetch distinct values in parallel
    const [citiesRaw, communitiesRaw, typesRaw] = await Promise.all([
      prisma.property.findMany({
        where: { ...where, city: { not: '' } },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
      prisma.property.findMany({
        where: { ...where, cityRegion: { not: null } },
        select: { cityRegion: true },
        distinct: ['cityRegion'],
        orderBy: { cityRegion: 'asc' },
      }),
      prisma.property.findMany({
        where: { ...where, type: { not: '' } },
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' },
      }),
    ])

    const cities = citiesRaw.map(r => r.city).filter(Boolean)
    const communities = communitiesRaw.map(r => r.cityRegion).filter(Boolean) as string[]
    const propertyTypes = typesRaw.map(r => r.type).filter(Boolean)

    return { cities, communities, propertyTypes }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getPublicSharedMlsWhere } from '../../../utils/tenant'
import { pillar9Service } from '../../../utils/pillar9.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Returns distinct cities, communities/regions, and property types
 * for the current tenant's properties so the UI can show dropdowns.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)

    // Match the catalog scoping used by /api/admin/price-cuts: shared MLS
    // (CREA + Pillar9) for all tenants, plus this tenant's manual rows.
    // Without this the dropdowns only listed cities where the current tenant
    // happened to own a manual row, which on most tenants is no rows at all.
    const tenantFilter = getTenantFilter(user)
    const sharedWhere = getPublicSharedMlsWhere(tenantFilter)
    const baseAnd: any[] = [sharedWhere, { status: { in: ['for_sale', 'pending'] } }]

    // Fetch distinct values in parallel
    const [citiesRaw, communitiesRaw, typesRaw] = await Promise.all([
      prisma.property.findMany({
        where: { AND: [...baseAnd, { city: { not: '' } }] },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
      prisma.property.findMany({
        where: { AND: [...baseAnd, { cityRegion: { not: null } }] },
        select: { cityRegion: true },
        distinct: ['cityRegion'],
        orderBy: { cityRegion: 'asc' },
      }),
      prisma.property.findMany({
        where: { AND: [...baseAnd, { type: { not: '' } }] },
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' },
      }),
    ])

    const cities = [...new Set(
      citiesRaw.map(r => r.city).filter(Boolean)
        .map(c => pillar9Service.getCityName(c))
        .filter(c => !/^\d+$/.test(c))
    )].sort()
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

import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getPublicSharedMlsWhere } from '../../../utils/tenant'
import { canonicalizeCityList } from '../../../utils/city-dictionary'
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

    // canonicalizeCityList:
    //  - resolves Pillar9 codes (e.g. '0100') to display names ('Edmonton')
    //  - dedupes "Calgary" + "Calgary (NW)" + '0046' + '0047' into one entry
    //  - drops still-unmapped numeric codes (no human label to show)
    //  - returns alphabetically sorted, deduped names
    const cities = canonicalizeCityList(citiesRaw.map(r => r.city))
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

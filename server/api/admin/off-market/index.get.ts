import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getPublicSharedMlsWhere } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


const OFF_MARKET_STATUSES = ['terminated', 'withdrawn', 'expired', 'sold']

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  // CREA + Pillar9 inventory is shared platform-wide (see SHARED_MLS_SOURCES in
  // server/utils/tenant.ts). Strict adminId scoping would hide the entire MLS
  // feed from every tenant whose adminId doesn't happen to match the row's
  // owner — which is what was breaking off-market listings on most tenants.
  // Use getPublicSharedMlsWhere so all tenants see CREA + Pillar9, and only
  // their own `manual` rows.
  const tenantFilter = getTenantFilter(user)
  const sharedWhere = getPublicSharedMlsWhere(tenantFilter)
  const query = getQuery(event) as any

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')))
  const skip = (page - 1) * limit

  const statusFilter = query.status && OFF_MARKET_STATUSES.includes(query.status)
    ? query.status
    : undefined

  const andConditions: any[] = [
    sharedWhere,
    { status: statusFilter ? statusFilter : { in: OFF_MARKET_STATUSES } },
  ]

  if (query.city) {
    andConditions.push({ city: { contains: query.city, mode: 'insensitive' } })
  }
  if (query.search) {
    andConditions.push({
      OR: [
        { address: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { mlsNumber: { contains: query.search, mode: 'insensitive' } },
      ],
    })
  }
  if (query.source) {
    andConditions.push({ source: query.source })
  }

  const where: any = { AND: andConditions }

  const sortField = query.sortBy || 'updatedAt'
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc'

  const [properties, total, statusCounts] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        province: true,
        price: true,
        firstEntryPrice: true,
        beds: true,
        baths: true,
        sqft: true,
        type: true,
        status: true,
        source: true,
        mlsNumber: true,
        images: true,
        updatedAt: true,
        createdAt: true,
        daysOnMarket: true,
        listingAgentData: true,
        listingOfficeData: true,
      }
    }),
    prisma.property.count({ where }),
    prisma.property.groupBy({
      by: ['status'],
      where: { AND: [sharedWhere, { status: { in: OFF_MARKET_STATUSES } }] },
      _count: true,
    }),
  ])

  const counts: Record<string, number> = { terminated: 0, withdrawn: 0, expired: 0, sold: 0 }
  for (const row of statusCounts) {
    counts[row.status] = row._count
  }

  return {
    properties,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    counts,
  }
})

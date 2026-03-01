import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

const OFF_MARKET_STATUSES = ['terminated', 'withdrawn', 'expired', 'sold']

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super admin access required' })
  }

  const tenantFilter = getTenantFilter(user)
  const query = getQuery(event) as any

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')))
  const skip = (page - 1) * limit

  const statusFilter = query.status && OFF_MARKET_STATUSES.includes(query.status)
    ? query.status
    : undefined

  const where: any = {
    ...tenantFilter,
    status: statusFilter ? statusFilter : { in: OFF_MARKET_STATUSES },
  }

  if (query.city) {
    where.city = { contains: query.city, mode: 'insensitive' }
  }
  if (query.search) {
    where.OR = [
      { address: { contains: query.search, mode: 'insensitive' } },
      { title: { contains: query.search, mode: 'insensitive' } },
      { mlsNumber: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.source) {
    where.source = query.source
  }

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
      where: { ...tenantFilter, status: { in: OFF_MARKET_STATUSES } },
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

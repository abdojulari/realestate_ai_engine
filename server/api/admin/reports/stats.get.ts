import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import {
  mergeTenantUserListWhere,
  mergeWhereOmitExcludedUserLink,
} from '../../../utils/delegateUserManagement'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function rangeToDates(range?: string, start?: string, end?: string) {
  const now = new Date()
  let from: Date | undefined
  let to: Date | undefined
  if (range === 'last_7_days') {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    to = now
  } else if (range === 'last_30_days' || !range) {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    to = now
  } else if (range === 'last_90_days') {
    from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    to = now
  } else if (range === 'this_year') {
    from = new Date(now.getFullYear(), 0, 1)
    to = now
  } else if (range === 'custom' && start && end) {
    from = new Date(start)
    to = new Date(end)
  }
  return { from, to }
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const userWhereAll = mergeTenantUserListWhere(user as any, {})

  const q = getQuery(event)
  const { from, to } = rangeToDates(q.range as string, q.start as string, q.end as string)

  const whereDate = from && to ? { gte: from, lte: to } : undefined

  const [totalUsers, totalListings, viewsCount, inquiriesCount, soldRevenue] = await Promise.all([
    prisma.user.count({ where: userWhereAll }),
    prisma.property.count({ where: tenantFilter }),
    prisma.propertyView.count({
      where: {
        ...(whereDate ? { createdAt: whereDate } : {}),
        property: tenantFilter
      }
    }),
    prisma.propertyInquiry.count({
      where: mergeWhereOmitExcludedUserLink(user as any, {
        ...tenantFilter,
        ...(whereDate ? { createdAt: whereDate } : {}),
      } as Record<string, unknown>),
    }),
    prisma.property.aggregate({
      _sum: { price: true },
      where: {
        ...tenantFilter,
        status: 'sold',
        ...(whereDate ? { updatedAt: whereDate } : {})
      }
    })
  ])

  return {
    totalListings,
    listingGrowth: 0,
    totalUsers,
    userGrowth: 0,
    totalViews: viewsCount,
    viewGrowth: 0,
    totalRevenue: Number((soldRevenue as any)._sum?.price || 0),
    revenueGrowth: 0
  }
})

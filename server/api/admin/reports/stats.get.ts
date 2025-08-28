import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

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

  const q = getQuery(event)
  const { from, to } = rangeToDates(q.range as string, q.start as string, q.end as string)

  const whereDate = from && to ? { gte: from, lte: to } : undefined

  const [totalUsers, totalListings, viewsCount, inquiriesCount, soldRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.propertyView.count({ where: whereDate ? { createdAt: whereDate } : {} }),
    prisma.propertyInquiry.count({ where: whereDate ? { createdAt: whereDate } : {} }),
    prisma.property.aggregate({
      _sum: { price: true },
      where: {
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



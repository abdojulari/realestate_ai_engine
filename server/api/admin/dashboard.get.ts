import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Ensure authenticated user exists and is admin
  const user = await requireAdmin(event)

  // Stats
  const [totalUsers, totalListings, properties, recentUsers, contentCount, inquiriesCount, viewsToday] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        address: true,
        status: true,
        images: true,
        createdAt: true,
      }
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
    }),
    prisma.contentBlock.count(),
    prisma.propertyInquiry.count(),
    prisma.propertyView.count({
      where: {
        createdAt: { gte: new Date(new Date().toDateString()) }
      }
    })
  ])

  const activeListings = await prisma.property.count({
    where: { status: { in: ['for_sale', 'for_rent', 'active'] } }
  })

  // Transform images/features json if stored as string
  const recentProperties = properties.map((p: any) => ({
    ...p,
    images: Array.isArray(p.images)
      ? p.images
      : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images) } catch { return ['/favicon.ico'] } })() : ['/favicon.ico'])
  }))

  return {
    stats: {
      totalUsers,
      userGrowth: 0,
      activeListings,
      totalListings,
      inquiriesThisMonth: inquiriesCount,
      totalInquiries: inquiriesCount,
      viewingsToday: viewsToday,
      viewingsThisWeek: viewsToday
    },
    recentUsers,
    recentProperties,
    contentCount
  }
})



import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../utils/auth'
import { getCached, setCache } from '../../utils/redis'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Ensure authenticated user exists and is admin
  const user = await requireAdmin(event)

  // Try to get cached dashboard data (5 minute cache)
  const cacheKey = 'dashboard:stats'
  const cached = await getCached(cacheKey)
  if (cached) {
    console.log('📊 Serving dashboard stats from cache')
    return cached
  }

  // Stats
  const [totalUsers, totalListings, properties, recentUsers, contentCount, inquiriesCount, viewsToday, creaProperties, manualProperties, lastSyncProperty, estimatesCount, pendingEstimates, recentEstimates] = await Promise.all([
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
    }),
    // CREA-specific stats
    prisma.property.count({
      where: { source: 'crea' }
    }),
    prisma.property.count({
      where: { source: 'manual' }
    }),
    prisma.property.findFirst({
      where: { 
        source: 'crea',
        lastSyncAt: { not: null }
      },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true }
    }),
    // Home Estimates stats
    prisma.homeEstimate.count(),
    prisma.homeEstimate.count({
      where: { status: 'pending' }
    }),
    prisma.homeEstimate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        address: true,
        status: true,
        createdAt: true
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

  const dashboardData = {
    stats: {
      totalUsers,
      userGrowth: 0,
      activeListings,
      totalListings,
      inquiriesThisMonth: inquiriesCount,
      totalInquiries: inquiriesCount,
      viewingsToday: viewsToday,
      viewingsThisWeek: viewsToday,
      // CREA sync statistics for settings page
      totalProperties: totalListings,
      creaProperties,
      manualProperties,
      lastSyncAt: lastSyncProperty?.lastSyncAt || null,
      // Home Estimates stats
      totalEstimates: estimatesCount,
      pendingEstimates: pendingEstimates,
      estimatesThisWeek: estimatesCount // You can make this more specific later
    },
    recentUsers,
    recentProperties,
    contentCount,
    recentEstimates
  }

  // Cache the dashboard data for 5 minutes
  await setCache(cacheKey, dashboardData, 300)
  console.log('📊 Dashboard stats cached for 5 minutes')

  return dashboardData
})



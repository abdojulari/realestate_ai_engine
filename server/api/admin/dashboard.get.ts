import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { getCached, setCache } from '../../utils/redis'
import { getTenantFilter } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  // Ensure authenticated user exists and is admin
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  // User filter: super_admin sees all users, admin sees only their tenant's users
  const userFilter = user.role === 'super_admin' ? {} : { adminId: user.id }

  // Use tenant-scoped cache key so each admin gets their own dashboard data
  const cacheKey = `dashboard:stats:${user.id}`
  const cached = await getCached(cacheKey)
  if (cached) {
    console.log('📊 Serving dashboard stats from cache')
    return cached
  }

  // Stats
  const [totalUsers, totalListings, properties, recentUsers, contentCount, inquiriesCount, viewsToday, creaProperties, manualProperties, lastSyncProperty, estimatesCount, pendingEstimates, recentEstimates] = await Promise.all([
    prisma.user.count({
      where: { ...userFilter }
    }),
    prisma.property.count({
      where: { ...tenantFilter }
    }),
    prisma.property.findMany({
      where: { ...tenantFilter },
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
      where: { ...userFilter },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
    }),
    prisma.contentBlock.count({
      where: { ...tenantFilter }
    }),
    prisma.propertyInquiry.count({
      where: { ...tenantFilter }
    }),
    prisma.propertyView.count({
      where: {
        createdAt: { gte: new Date(new Date().toDateString()) }
      }
    }),
    // CREA-specific stats
    prisma.property.count({
      where: { source: 'crea', ...tenantFilter }
    }),
    prisma.property.count({
      where: { source: 'manual', ...tenantFilter }
    }),
    prisma.property.findFirst({
      where: {
        source: 'crea',
        lastSyncAt: { not: null },
        ...tenantFilter
      },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true }
    }),
    // Home Estimates stats
    prisma.homeEstimate.count({
      where: { ...tenantFilter }
    }),
    prisma.homeEstimate.count({
      where: { status: 'pending', ...tenantFilter }
    }),
    prisma.homeEstimate.findMany({
      where: { ...tenantFilter },
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
    where: { status: { in: ['for_sale', 'for_rent', 'active'] }, ...tenantFilter }
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

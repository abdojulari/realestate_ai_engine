import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth'
import {
  mergeTenantUserListWhere,
  mergeWhereOmitExcludedUserLink,
} from '../../utils/delegateUserManagement'
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

  const userWhereAll = mergeTenantUserListWhere(user as any, {})

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
      where: userWhereAll,
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
      where: userWhereAll,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
    }),
    prisma.contentBlock.count({
      where: { ...tenantFilter }
    }),
    prisma.propertyInquiry.count({
      where: mergeWhereOmitExcludedUserLink(user as any, tenantFilter as Record<string, unknown>),
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
      where: mergeWhereOmitExcludedUserLink(user as any, tenantFilter as Record<string, unknown>),
    }),
    prisma.homeEstimate.count({
      where: mergeWhereOmitExcludedUserLink(user as any, {
        status: 'pending',
        ...tenantFilter,
      } as Record<string, unknown>),
    }),
    prisma.homeEstimate.findMany({
      where: mergeWhereOmitExcludedUserLink(user as any, tenantFilter as Record<string, unknown>),
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

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [inquiriesThisMonth, inquiriesPrevMonth, usersThisMonth, usersPrevMonth] = await Promise.all([
    prisma.propertyInquiry.count({
      where: mergeWhereOmitExcludedUserLink(user as any, {
        ...tenantFilter,
        createdAt: { gte: startOfMonth },
      } as Record<string, unknown>),
    }),
    prisma.propertyInquiry.count({
      where: mergeWhereOmitExcludedUserLink(user as any, {
        ...tenantFilter,
        createdAt: { gte: startPrevMonth, lt: startOfMonth },
      } as Record<string, unknown>),
    }),
    prisma.user.count({
      where: mergeTenantUserListWhere(user as any, { createdAt: { gte: startOfMonth } }),
    }),
    prisma.user.count({
      where: mergeTenantUserListWhere(user as any, {
        createdAt: { gte: startPrevMonth, lt: startOfMonth },
      }),
    }),
  ])

  const userGrowth =
    usersPrevMonth > 0
      ? Math.round(((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 100)
      : usersThisMonth > 0
        ? 100
        : 0

  const inquiryGrowth =
    inquiriesPrevMonth > 0
      ? Math.round(((inquiriesThisMonth - inquiriesPrevMonth) / inquiriesPrevMonth) * 100)
      : inquiriesThisMonth > 0
        ? 100
        : 0

  // Last 7 days: user sign-ups + listing detail views (tenant-scoped properties)
  const dayCount = 7
  const trendKeys: string[] = []
  const trendLabels: string[] = []
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    trendKeys.push(d.toISOString().slice(0, 10))
    trendLabels.push(
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    )
  }
  const rangeStart = new Date(`${trendKeys[0]}T00:00:00.000Z`)

  const viewWhere: { createdAt: { gte: Date }; property?: { adminId: number } } = {
    createdAt: { gte: rangeStart },
  }
  if (typeof tenantFilter.adminId === 'number') {
    viewWhere.property = { adminId: tenantFilter.adminId }
  }

  const weekAgo = new Date()
  weekAgo.setUTCHours(0, 0, 0, 0)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  const viewWeekWhere: { createdAt: { gte: Date }; property?: { adminId: number } } = {
    createdAt: { gte: weekAgo },
  }
  if (typeof tenantFilter.adminId === 'number') {
    viewWeekWhere.property = { adminId: tenantFilter.adminId }
  }

  const [userCreations, viewEvents, viewsWeekCount] = await Promise.all([
    prisma.user.findMany({
      where: mergeTenantUserListWhere(user as any, { createdAt: { gte: rangeStart } }),
      select: { createdAt: true },
    }),
    prisma.propertyView.findMany({
      where: viewWhere as any,
      select: { createdAt: true },
    }),
    prisma.propertyView.count({
      where: viewWeekWhere as any,
    }),
  ])

  const utcDayKey = (dt: Date) => dt.toISOString().slice(0, 10)

  const userSignups = trendKeys.map(() => 0)
  const listingViews = trendKeys.map(() => 0)
  const keyIndex = Object.fromEntries(trendKeys.map((k, i) => [k, i]))
  for (const u of userCreations) {
    const k = utcDayKey(u.createdAt)
    const idx = keyIndex[k]
    if (idx !== undefined) userSignups[idx]++
  }
  for (const v of viewEvents) {
    const k = utcDayKey(v.createdAt)
    const idx = keyIndex[k]
    if (idx !== undefined) listingViews[idx]++
  }

  const insights: Array<{ title: string; body: string; icon: string; variant: 'gold' | 'slate' | 'emerald' }> = []
  if (activeListings > 0) {
    insights.push({
      title: 'Active inventory',
      body: `${activeListings} live listing${activeListings === 1 ? '' : 's'} across your portfolio. CREA ${creaProperties} · manual ${manualProperties}.`,
      icon: 'mdi-view-dashboard-variant',
      variant: 'gold',
    })
  }
  if (inquiriesThisMonth > 0 || inquiriesPrevMonth > 0) {
    insights.push({
      title: 'Lead momentum',
      body: `${inquiriesThisMonth} inquiries this month (${inquiryGrowth >= 0 ? '+' : ''}${inquiryGrowth}% vs last month).`,
      icon: 'mdi-finance',
      variant: 'emerald',
    })
  }
  insights.push({
    title: 'Engagement signal',
    body:
      viewsWeekCount > 0
        ? `${viewsWeekCount} property detail views in the last 7 days — keep nurturing high-intent traffic.`
        : 'Listing views will appear here as buyers explore your properties. Share listings to boost traffic.',
    icon: 'mdi-chart-timeline-variant-shimmer',
    variant: 'slate',
  })
  if (pendingEstimates > 0) {
    insights.push({
      title: 'Valuation pipeline',
      body: `${pendingEstimates} home estimate request${pendingEstimates === 1 ? '' : 's'} awaiting follow-up.`,
      icon: 'mdi-home-analytics',
      variant: 'gold',
    })
  }

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
      userGrowth,
      activeListings,
      totalListings,
      inquiriesThisMonth,
      totalInquiries: inquiriesCount,
      viewingsToday: viewsToday,
      viewingsThisWeek: viewsWeekCount,
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
    recentEstimates,
    trends: {
      labels: trendLabels,
      userSignups,
      listingViews,
    },
    insights,
  }

  // Cache the dashboard data for 5 minutes
  await setCache(cacheKey, dashboardData, 300)
  console.log('📊 Dashboard stats cached for 5 minutes')

  return dashboardData
})

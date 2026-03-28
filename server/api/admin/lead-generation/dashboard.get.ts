import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

function getDateRange(period: string) {
  const now = new Date()
  const start = new Date(now)

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 7)
      break
    case 'month':
      start.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(now.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(now.getFullYear() - 1)
      break
    default:
      start.setMonth(now.getMonth() - 1)
  }

  return { gte: start, lte: now }
}

function getMonthlyBuckets(count: number) {
  const buckets = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      label: d.toLocaleString('en', { month: 'short', year: '2-digit' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    })
  }
  return buckets
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)

    const [
      totalInquiries,
      totalChatLeads,
      totalEstimates,
      totalSubscribers,
      totalCrmLeads,
      newInquiries,
      newChatLeads,
      newEstimates,
      newSubscribers,
      inquiryStatuses,
      chatLeadStatuses,
      estimateStatuses,
      crmLeadSources,
      recentLeads,
    ] = await Promise.all([
      prisma.propertyInquiry.count({ where: tenantFilter }),
      prisma.chatLead.count({ where: tenantFilter }),
      prisma.homeEstimate.count({ where: tenantFilter }),
      prisma.newsletterSubscriber.count({ where: { ...tenantFilter, status: 'active' } }),
      prisma.crmClient.count({ where: { ...tenantFilter, type: 'lead' } }),

      prisma.propertyInquiry.count({ where: { ...tenantFilter, status: 'new' } }),
      prisma.chatLead.count({ where: { ...tenantFilter, status: 'new' } }),
      prisma.homeEstimate.count({ where: { ...tenantFilter, status: 'pending' } }),
      prisma.newsletterSubscriber.count({
        where: { ...tenantFilter, status: 'active', subscribedAt: getDateRange('month') },
      }),

      // @ts-ignore
      prisma.propertyInquiry.groupBy({ by: ['status'], where: tenantFilter, _count: true }),
      // @ts-ignore
      prisma.chatLead.groupBy({ by: ['status'], where: tenantFilter, _count: true }),
      // @ts-ignore
      prisma.homeEstimate.groupBy({ by: ['status'], where: tenantFilter, _count: true }),
      // @ts-ignore
      prisma.crmClient.groupBy({ by: ['source'], where: { ...tenantFilter, type: 'lead' }, _count: true }),

      prisma.chatLead.findMany({
        where: tenantFilter,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, name: true, email: true, phone: true, source: true, status: true, createdAt: true },
      }),
    ])

    // Monthly trend data (last 12 months)
    const months = getMonthlyBuckets(12)
    const monthlyData = await Promise.all(
      months.map(async (m) => {
        const range = { gte: m.start, lte: m.end }
        const [inq, chat, est, subs] = await Promise.all([
          prisma.propertyInquiry.count({ where: { ...tenantFilter, createdAt: range } }),
          prisma.chatLead.count({ where: { ...tenantFilter, createdAt: range } }),
          prisma.homeEstimate.count({ where: { ...tenantFilter, createdAt: range } }),
          prisma.newsletterSubscriber.count({ where: { ...tenantFilter, subscribedAt: range } }),
        ])
        return { month: m.label, inquiries: inq, chatLeads: chat, estimates: est, subscribers: subs, total: inq + chat + est + subs }
      })
    )

    // Quarterly aggregation
    const quarterlyData = []
    for (let i = 0; i < monthlyData.length; i += 3) {
      const chunk = monthlyData.slice(i, i + 3)
      quarterlyData.push({
        quarter: `Q${Math.floor(i / 3) + 1}`,
        total: chunk.reduce((s, c) => s + c.total, 0),
        inquiries: chunk.reduce((s, c) => s + c.inquiries, 0),
        chatLeads: chunk.reduce((s, c) => s + c.chatLeads, 0),
        estimates: chunk.reduce((s, c) => s + c.estimates, 0),
        subscribers: chunk.reduce((s, c) => s + c.subscribers, 0),
      })
    }

    // Funnel stages
    const totalLeads = totalInquiries + totalChatLeads + totalEstimates + totalCrmLeads
    const contacted = inquiryStatuses.find((s: any) => s.status === 'responded')?._count || 0
    const qualified = crmLeadSources.reduce((s: number, c: any) => s + c._count, 0)
    const converted = await prisma.crmClient.count({
      where: { ...tenantFilter, type: { in: ['buyer', 'seller', 'investor'] } },
    })

    // Recent combined leads from all sources
    const recentInquiries = await prisma.propertyInquiry.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, message: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    })

    const recentEstimates = await prisma.homeEstimate.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, address: true, status: true, createdAt: true },
    })

    const allRecentLeads = [
      ...recentLeads.map((l: any) => ({ ...l, type: 'chat', source: l.source || 'Chat Widget' })),
      ...recentInquiries.map((i: any) => ({
        id: i.id, name: [i.user?.firstName, i.user?.lastName].filter(Boolean).join(' ') || 'Unknown',
        email: i.user?.email || '', phone: i.user?.phone || '',
        source: 'Property Inquiry', status: i.status, createdAt: i.createdAt, type: 'inquiry',
      })),
      ...recentEstimates.map((e: any) => ({
        id: e.id, name: `${e.firstName} ${e.lastName}`,
        email: e.email, phone: e.phone,
        source: 'Home Estimate', status: e.status, createdAt: e.createdAt, type: 'estimate',
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 25)

    return {
      kpis: {
        totalLeads,
        newLeads: newInquiries + newChatLeads + newEstimates,
        activeSubscribers: totalSubscribers,
        conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
      },
      sources: {
        inquiries: totalInquiries,
        chatLeads: totalChatLeads,
        estimates: totalEstimates,
        subscribers: totalSubscribers,
        crmLeads: totalCrmLeads,
      },
      funnel: {
        captured: totalLeads,
        contacted: contacted + Math.round(totalLeads * 0.6),
        qualified,
        converted,
      },
      pipeline: {
        inquiryStatuses: inquiryStatuses.reduce((a: any, s: any) => ({ ...a, [s.status]: s._count }), {}),
        chatLeadStatuses: chatLeadStatuses.reduce((a: any, s: any) => ({ ...a, [s.status]: s._count }), {}),
        estimateStatuses: estimateStatuses.reduce((a: any, s: any) => ({ ...a, [s.status]: s._count }), {}),
      },
      trends: { monthly: monthlyData, quarterly: quarterlyData },
      recentLeads: allRecentLeads,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to load lead generation dashboard',
    })
  }
})

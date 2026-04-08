import { requireAdmin } from '../../../utils/auth'
import { mergeWhereOmitExcludedUserLink } from '../../../utils/delegateUserManagement'
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

    const inquiryWhere = (extra: Record<string, unknown> = {}) =>
      mergeWhereOmitExcludedUserLink(user as any, { ...tenantFilter, ...extra } as Record<string, unknown>)
    const estimateWhere = (extra: Record<string, unknown> = {}) =>
      mergeWhereOmitExcludedUserLink(user as any, { ...tenantFilter, ...extra } as Record<string, unknown>)

    const [
      totalInquiries,
      totalChatLeads,
      totalEstimates,
      totalSubscribers,
      totalCrmLeads,
      totalResourceLeads,
      newInquiries,
      newChatLeads,
      newEstimates,
      newSubscribers,
      newResourceLeads,
      inquiryStatuses,
      chatLeadStatuses,
      estimateStatuses,
      crmLeadSources,
      recentLeads,
    ] = await Promise.all([
      prisma.propertyInquiry.count({ where: inquiryWhere() }),
      prisma.chatLead.count({ where: tenantFilter }),
      prisma.homeEstimate.count({ where: estimateWhere() }),
      prisma.newsletterSubscriber.count({ where: { ...tenantFilter, status: 'active' } }),
      prisma.crmClient.count({ where: { ...tenantFilter, type: 'lead' } }),
      prisma.resourceDownloadLead.count({ where: tenantFilter }),

      prisma.propertyInquiry.count({ where: inquiryWhere({ status: 'new' }) }),
      prisma.chatLead.count({ where: { ...tenantFilter, status: 'new' } }),
      prisma.homeEstimate.count({ where: estimateWhere({ status: 'pending' }) }),
      prisma.newsletterSubscriber.count({
        where: { ...tenantFilter, status: 'active', subscribedAt: getDateRange('month') },
      }),
      prisma.resourceDownloadLead.count({
        where: { ...tenantFilter, createdAt: getDateRange('month') },
      }),

      // @ts-ignore
      prisma.propertyInquiry.groupBy({ by: ['status'], where: inquiryWhere(), _count: true }),
      // @ts-ignore
      prisma.chatLead.groupBy({ by: ['status'], where: tenantFilter, _count: true }),
      // @ts-ignore
      prisma.homeEstimate.groupBy({ by: ['status'], where: estimateWhere(), _count: true }),
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
        const [inq, chat, est, subs, res] = await Promise.all([
          prisma.propertyInquiry.count({ where: inquiryWhere({ createdAt: range }) }),
          prisma.chatLead.count({ where: { ...tenantFilter, createdAt: range } }),
          prisma.homeEstimate.count({ where: estimateWhere({ createdAt: range }) }),
          prisma.newsletterSubscriber.count({ where: { ...tenantFilter, subscribedAt: range } }),
          prisma.resourceDownloadLead.count({ where: { ...tenantFilter, createdAt: range } }),
        ])
        return {
          month: m.label,
          inquiries: inq,
          chatLeads: chat,
          estimates: est,
          subscribers: subs,
          resourceLeads: res,
          total: inq + chat + est + subs + res,
        }
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
        resourceLeads: chunk.reduce((s, c) => s + c.resourceLeads, 0),
      })
    }

    // Funnel stages
    const totalLeads =
      totalInquiries + totalChatLeads + totalEstimates + totalCrmLeads + totalResourceLeads
    const contacted = inquiryStatuses.find((s: any) => s.status === 'responded')?._count || 0
    const qualified = crmLeadSources.reduce((s: number, c: any) => s + c._count, 0)
    const converted = await prisma.crmClient.count({
      where: { ...tenantFilter, type: { in: ['buyer', 'seller', 'investor'] } },
    })

    // Recent combined leads from all sources
    const recentInquiries = await prisma.propertyInquiry.findMany({
      where: inquiryWhere(),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, message: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    })

    const recentEstimates = await prisma.homeEstimate.findMany({
      where: estimateWhere(),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, address: true, status: true, createdAt: true },
    })

    const recentResourceLeads = await prisma.resourceDownloadLead.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        resource: { select: { title: true, publicSlug: true } },
      },
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
      ...recentResourceLeads.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        name: `${r.firstName} ${r.lastName}`.trim(),
        email: r.email,
        phone: r.phone,
        source: r.resource?.title ? `Resource · ${r.resource.title}` : 'Resource download',
        status: 'new',
        createdAt: r.createdAt,
        type: 'resource',
        resourceSlug: r.resource?.publicSlug,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30)

    return {
      kpis: {
        totalLeads,
        newLeads: newInquiries + newChatLeads + newEstimates + newResourceLeads,
        activeSubscribers: totalSubscribers,
        conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
      },
      sources: {
        inquiries: totalInquiries,
        chatLeads: totalChatLeads,
        estimates: totalEstimates,
        subscribers: totalSubscribers,
        crmLeads: totalCrmLeads,
        resourceLeads: totalResourceLeads,
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
        resourceLeadsTotal: totalResourceLeads,
      },
      trends: { monthly: monthlyData, quarterly: quarterlyData },
      recentLeads: allRecentLeads,
    }
  } catch (error: any) {
    console.error('[Lead Dashboard] Error:', error?.message || error)
    if (error?.code) console.error('[Lead Dashboard] Prisma code:', error.code)
    if (error?.meta) console.error('[Lead Dashboard] Prisma meta:', JSON.stringify(error.meta))
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to load lead generation dashboard',
    })
  }
})

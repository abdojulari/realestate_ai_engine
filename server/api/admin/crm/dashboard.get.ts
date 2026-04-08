import { requireAdmin } from '../../../utils/auth'
import { mergeWhereOmitExcludedUserLink } from '../../../utils/delegateUserManagement'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)

    const inquiryWhere = (extra: Record<string, unknown> = {}) =>
      mergeWhereOmitExcludedUserLink(user as any, { ...tenantFilter, ...extra } as Record<string, unknown>)
    const estimateWhere = (extra: Record<string, unknown> = {}) =>
      mergeWhereOmitExcludedUserLink(user as any, { ...tenantFilter, ...extra } as Record<string, unknown>)

// @ts-ignore
    const [
      clientCounts,
      transactionCounts,
      recentClients,
      activeTransactions
    ] = await Promise.all([
      // @ts-ignore
      prisma.crmClient.groupBy({
        by: ['type'],
        where: { ...tenantFilter, status: 'active' },
        _count: true
      }),
      // @ts-ignore
      prisma.crmTransaction.groupBy({
        by: ['status'],
        where: { ...tenantFilter },
        _count: true
      }),
      // @ts-ignore
      prisma.crmClient.findMany({
        where: { ...tenantFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, firstName: true, lastName: true, type: true, email: true, createdAt: true }
      }),
      // @ts-ignore
      prisma.crmTransaction.findMany({
        where: { ...tenantFilter, status: { in: ['active', 'conditional', 'firm'] } },
        include: {
          client: { select: { firstName: true, lastName: true } },
          checklist: { select: { id: true, isCompleted: true, isRequired: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    ])

    // Recent leads from various sources
    const [inquiries, chatLeads, estimates] = await Promise.all([
      prisma.propertyInquiry.count({ where: inquiryWhere({ status: 'new' }) }),
      prisma.chatLead.count({ where: { ...tenantFilter, status: 'new' } }),
      prisma.homeEstimate.count({ where: estimateWhere({ status: 'pending' }) })
    ])

    return {
      clients: {
        byType: clientCounts.reduce((acc: any, c: any) => {
          acc[c.type] = c._count
          return acc
        }, {} as Record<string, number>),
        total: clientCounts.reduce((sum: number, c: any) => sum + c._count, 0)
      },
      transactions: {
        byStatus: transactionCounts.reduce((acc: any, t: any) => {
          acc[t.status] = t._count
          return acc
        }, {} as Record<string, number>),
        total: transactionCounts.reduce((sum: number, t: any) => sum + t._count, 0)
      },
      pendingLeads: {
        inquiries,
        chatLeads,
        estimates,
        total: inquiries + chatLeads + estimates
      },
      recentClients,
      activeTransactions: activeTransactions.map((t: any) => ({
        ...t,
        completedItems: t.checklist.filter((c: any) => c.isCompleted).length,
        totalItems: t.checklist.filter((c: any) => c.isRequired).length,
      }))
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

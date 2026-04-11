import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const status = query.status as string
    const type = query.type as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }
    if (status) where.status = status
    if (type) where.type = type

    const [transactions, total] = await Promise.all([
      prisma.crmTransaction.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, type: true }
          },
          checklist: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, label: true, isCompleted: true, category: true, sortOrder: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.crmTransaction.count({ where })
    ])

    // Get status summary
    const statusCounts = await prisma.crmTransaction.groupBy({
      by: ['status'],
      where: { ...tenantFilter },
      _count: true
    })

    return {
      transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: {
        total,
        byStatus: statusCounts.reduce((acc, s) => {
          acc[s.status] = s._count
          return acc
        }, {} as Record<string, number>)
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

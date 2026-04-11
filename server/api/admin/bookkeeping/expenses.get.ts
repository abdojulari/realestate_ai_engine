import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const category = query.category as string
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }

    if (category) where.category = category
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }
    if (search) {
      where.OR = [
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [expenses, total] = await Promise.all([
      prisma.bkExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bkExpense.count({ where }),
    ])

    const summaryAgg = await prisma.bkExpense.aggregate({
      where,
      _sum: { total: true },
      _count: true,
    })

    return {
      expenses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summaryAgg._sum.total || 0,
        count: summaryAgg._count,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error',
    })
  }
})

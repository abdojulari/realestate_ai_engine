import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const category = query.category as string
    const source = query.source as string
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }

    if (category) where.category = category
    if (source) where.source = source
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [revenues, total] = await Promise.all([
      prisma.bkRevenue.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bkRevenue.count({ where }),
    ])

    const summaryAgg = await prisma.bkRevenue.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    })

    return {
      revenues,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summaryAgg._sum.amount || 0,
        count: summaryAgg._count,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

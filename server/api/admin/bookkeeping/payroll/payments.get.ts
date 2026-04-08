import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
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
    const query = getQuery(event)

    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const employeeId = query.employeeId as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }

    if (dateFrom || dateTo) {
      where.payDate = {}
      if (dateFrom) where.payDate.gte = new Date(dateFrom)
      if (dateTo) where.payDate.lte = new Date(dateTo)
    }
    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    const [payments, total] = await Promise.all([
      prisma.bkPayrollPayment.findMany({
        where,
        include: {
          employee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { payDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bkPayrollPayment.count({ where }),
    ])

    const summaryAgg = await prisma.bkPayrollPayment.aggregate({
      where,
      _sum: { grossAmount: true, netAmount: true },
      _count: true,
    })

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalGross: summaryAgg._sum.grossAmount || 0,
        totalNet: summaryAgg._sum.netAmount || 0,
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

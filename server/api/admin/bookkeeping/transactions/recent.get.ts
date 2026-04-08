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

    const year = parseInt(query.year as string) || new Date().getFullYear()
    const limit = Math.min(parseInt(query.limit as string) || 10, 50)

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)

    const dateFilter = { gte: yearStart, lt: yearEnd }

    const [expenses, revenues, payrollPayments] = await Promise.all([
      prisma.bkExpense.findMany({
        where: { ...tenantFilter, date: dateFilter },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
          id: true,
          vendor: true,
          category: true,
          total: true,
          date: true,
          description: true,
        }
      }),
      prisma.bkRevenue.findMany({
        where: { ...tenantFilter, date: dateFilter },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
          id: true,
          source: true,
          category: true,
          amount: true,
          date: true,
          description: true,
        }
      }),
      prisma.bkPayrollPayment.findMany({
        where: { ...tenantFilter, payDate: dateFilter },
        orderBy: { payDate: 'desc' },
        take: limit,
        select: {
          id: true,
          grossAmount: true,
          netAmount: true,
          payDate: true,
          employee: { select: { name: true } }
        }
      })
    ])

    const transactions = [
      ...expenses.map(e => ({
        id: `exp-${e.id}`,
        type: 'expense' as const,
        description: e.vendor || e.description || 'Expense',
        category: e.category || 'Uncategorized',
        amount: -(e.total || 0),
        date: e.date?.toISOString() || ''
      })),
      ...revenues.map(r => ({
        id: `rev-${r.id}`,
        type: 'revenue' as const,
        description: r.source || r.description || 'Revenue',
        category: r.category || 'Uncategorized',
        amount: r.amount || 0,
        date: r.date?.toISOString() || ''
      })),
      ...payrollPayments.map(p => ({
        id: `pay-${p.id}`,
        type: 'payroll' as const,
        description: `Payroll - ${p.employee?.name || 'Employee'}`,
        category: 'Payroll',
        amount: -(p.netAmount || p.grossAmount || 0),
        date: p.payDate?.toISOString() || ''
      }))
    ]

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return transactions.slice(0, limit)
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error'
    })
  }
})

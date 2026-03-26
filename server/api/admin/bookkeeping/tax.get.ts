import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { TaxFacade, getProvinceList } from '../../../utils/bookkeeping/tax/index'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    await requireFeatureForUser(FEATURES.BOOKKEEPING, user, event)
    const query = getQuery(event)

    const province = (query.province as string) || 'ON'
    const businessType = (query.businessType as 'sole_prop' | 'corporation') || 'sole_prop'

    const adminId = getTenantAdminId(user)
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    const dateFilter: any = { gte: yearStart, lte: yearEnd }
    const tenantWhere: any = adminId ? { adminId } : {}

    // Allow overrides from query params, otherwise pull from DB
    let grossIncome = parseFloat(query.grossIncome as string) || 0
    let totalExpenses = parseFloat(query.totalExpenses as string) || 0

    if (!grossIncome || !totalExpenses) {
      const [revenueAgg, expenseAgg] = await Promise.all([
        prisma.bkRevenue.aggregate({
          where: { ...tenantWhere, date: dateFilter },
          _sum: { amount: true },
        }),
        prisma.bkExpense.aggregate({
          where: { ...tenantWhere, date: dateFilter },
          _sum: { total: true },
        }),
      ])

      if (!grossIncome) grossIncome = Number(revenueAgg._sum.amount) || 0
      if (!totalExpenses) totalExpenses = Number(expenseAgg._sum.total) || 0
    }

    // Calculate full tax summary for selected province
    const facade = new TaxFacade(province)
    const estimate = facade.calculateFullSummary(grossIncome, totalExpenses, businessType)

    // Calculate province comparison in a single call
    const comparison = TaxFacade.compareProvinces(grossIncome, totalExpenses, businessType)

    const provinces = getProvinceList()

    return { estimate, provinces, comparison }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

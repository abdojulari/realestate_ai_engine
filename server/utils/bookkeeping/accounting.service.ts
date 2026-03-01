import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
/**
 * Accounting Service
 * Profit & Loss calculations, period summaries, and financial aggregations.
 */

export interface DateRange {
  start: Date
  end: Date
  label?: string
}

export interface ProfitLossSummary {
  period: string
  revenue: { total: number; byCategory: Record<string, number>; count: number }
  expenses: { total: number; byCategory: Record<string, number>; count: number }
  payroll: { total: number; count: number }
  netProfit: number
  margin: number
}

export interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  totalPayroll: number
  netProfit: number
  revenueCount: number
  expenseCount: number
  payrollCount: number
  topExpenseCategories: { category: string; total: number }[]
  topRevenueCategories: { category: string; total: number }[]
  monthlyTrend: { month: string; revenue: number; expenses: number; payroll: number; net: number }[]
}

// ─── Period Helpers ───

export function getMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end, label: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }) }
}

export function getQuarterRange(year: number, quarter: number): DateRange {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
  return { start, end, label: `Q${quarter} ${year}` }
}

export function getMidYearRange(year: number): DateRange {
  return { start: new Date(year, 0, 1), end: new Date(year, 5, 30, 23, 59, 59, 999), label: `Jan–Jun ${year}` }
}

export function getAnnualRange(year: number): DateRange {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999), label: `${year}` }
}

export function getCustomRange(start: string, end: string): DateRange {
  return { start: new Date(start), end: new Date(end), label: `${start} to ${end}` }
}

// ─── Aggregation Queries ───

export async function getRevenueSummary(adminId: number | null, range: DateRange) {
  const where: any = { date: { gte: range.start, lte: range.end } }
  if (adminId) where.adminId = adminId

  const revenues = await prisma.bkRevenue.findMany({ where })
  const total = revenues.reduce((s, r) => s + r.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const r of revenues) {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.amount
  }
  return { total: Math.round(total * 100) / 100, byCategory, count: revenues.length }
}

export async function getExpenseSummary(adminId: number | null, range: DateRange) {
  const where: any = { date: { gte: range.start, lte: range.end } }
  if (adminId) where.adminId = adminId

  const expenses = await prisma.bkExpense.findMany({ where })
  const total = expenses.reduce((s, e) => s + e.total, 0)
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.total
  }
  return { total: Math.round(total * 100) / 100, byCategory, count: expenses.length }
}

export async function getPayrollSummary(adminId: number | null, range: DateRange) {
  const where: any = { payDate: { gte: range.start, lte: range.end } }
  if (adminId) where.adminId = adminId

  const payments = await prisma.bkPayrollPayment.findMany({ where })
  const total = payments.reduce((s, p) => s + p.grossAmount, 0)
  return { total: Math.round(total * 100) / 100, count: payments.length }
}

export async function calculateProfitLoss(adminId: number | null, range: DateRange): Promise<ProfitLossSummary> {
  const [revenue, expenses, payroll] = await Promise.all([
    getRevenueSummary(adminId, range),
    getExpenseSummary(adminId, range),
    getPayrollSummary(adminId, range),
  ])

  const netProfit = revenue.total - expenses.total - payroll.total
  const margin = revenue.total > 0 ? netProfit / revenue.total : 0

  return {
    period: range.label || 'Custom',
    revenue,
    expenses,
    payroll,
    netProfit: Math.round(netProfit * 100) / 100,
    margin: Math.round(margin * 10000) / 10000,
  }
}

export async function getFinancialDashboard(adminId: number | null, year: number): Promise<FinancialSummary> {
  const range = getAnnualRange(year)

  const [revenue, expenses, payroll] = await Promise.all([
    getRevenueSummary(adminId, range),
    getExpenseSummary(adminId, range),
    getPayrollSummary(adminId, range),
  ])

  const topExpenseCategories = Object.entries(expenses.byCategory)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const topRevenueCategories = Object.entries(revenue.byCategory)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Monthly trend
  const monthlyTrend: FinancialSummary['monthlyTrend'] = []
  for (let m = 1; m <= 12; m++) {
    const mr = getMonthRange(year, m)
    const [mRev, mExp, mPay] = await Promise.all([
      getRevenueSummary(adminId, mr),
      getExpenseSummary(adminId, mr),
      getPayrollSummary(adminId, mr),
    ])
    monthlyTrend.push({
      month: mr.start.toLocaleString('en-US', { month: 'short' }),
      revenue: mRev.total,
      expenses: mExp.total,
      payroll: mPay.total,
      net: mRev.total - mExp.total - mPay.total,
    })
  }

  return {
    totalRevenue: revenue.total,
    totalExpenses: expenses.total,
    totalPayroll: payroll.total,
    netProfit: revenue.total - expenses.total - payroll.total,
    revenueCount: revenue.count,
    expenseCount: expenses.count,
    payrollCount: payroll.count,
    topExpenseCategories,
    topRevenueCategories,
    monthlyTrend,
  }
}

// ─── Expense Categories ───
export const EXPENSE_CATEGORIES = [
  'advertising', 'auto', 'bank_fees', 'commissions', 'education',
  'equipment', 'insurance', 'legal', 'meals', 'office_supplies',
  'phone', 'rent', 'repairs', 'software', 'travel', 'utilities',
  'wages', 'general', 'other'
]

export const REVENUE_CATEGORIES = [
  'commission', 'referral', 'consulting', 'rental_income',
  'coaching', 'other'
]

import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getTenantAdminId } from '../../../utils/tenant'
import { calculateProfitLoss, getCustomRange, getAnnualRange } from '../../../utils/bookkeeping/accounting.service'
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

    const type = (query.type as string) || 'expenses'
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string

    let csv = ''

    const dateWhere: any = {}
    if (dateFrom || dateTo) {
      if (dateFrom) dateWhere.gte = new Date(dateFrom)
      if (dateTo) dateWhere.lte = new Date(dateTo)
    }

    switch (type) {
      case 'expenses': {
        const where: any = { ...tenantFilter }
        if (Object.keys(dateWhere).length) where.date = dateWhere

        const expenses = await prisma.bkExpense.findMany({
          where,
          orderBy: { date: 'desc' },
        })

        csv = 'Date,Vendor,Category,Receipt #,Subtotal,GST,HST,PST,Tax,Total,Payment Method,Description\n'
        for (const e of expenses) {
          csv += [
            e.date.toISOString().split('T')[0],
            `"${(e.vendor || '').replace(/"/g, '""')}"`,
            e.category,
            e.receiptNumber || '',
            e.subtotal ?? '',
            e.gstAmount ?? '',
            e.hstAmount ?? '',
            e.pstAmount ?? '',
            e.taxAmount ?? '',
            e.total,
            e.paymentMethod || '',
            `"${(e.description || '').replace(/"/g, '""')}"`,
          ].join(',') + '\n'
        }
        break
      }

      case 'revenue': {
        const where: any = { ...tenantFilter }
        if (Object.keys(dateWhere).length) where.date = dateWhere

        const revenues = await prisma.bkRevenue.findMany({
          where,
          orderBy: { date: 'desc' },
        })

        csv = 'Date,Amount,Category,Source,Client,Invoice #,Description\n'
        for (const r of revenues) {
          csv += [
            r.date.toISOString().split('T')[0],
            r.amount,
            r.category,
            r.source || '',
            `"${(r.clientName || '').replace(/"/g, '""')}"`,
            r.invoiceNumber || '',
            `"${(r.description || '').replace(/"/g, '""')}"`,
          ].join(',') + '\n'
        }
        break
      }

      case 'payroll': {
        const where: any = { ...tenantFilter }
        if (Object.keys(dateWhere).length) where.payDate = dateWhere

        const payments = await prisma.bkPayrollPayment.findMany({
          where,
          include: { employee: { select: { name: true } } },
          orderBy: { payDate: 'desc' },
        })

        csv = 'Pay Date,Employee,Period Start,Period End,Hours,Gross,CPP,EI,Income Tax,Other Deductions,Net,Notes\n'
        for (const p of payments) {
          csv += [
            p.payDate.toISOString().split('T')[0],
            `"${(p.employee?.name || '').replace(/"/g, '""')}"`,
            p.periodStart ? p.periodStart.toISOString().split('T')[0] : '',
            p.periodEnd ? p.periodEnd.toISOString().split('T')[0] : '',
            p.hoursWorked ?? '',
            p.grossAmount,
            p.cppDeduction,
            p.eiDeduction,
            p.incomeTaxDeduction,
            p.otherDeductions,
            p.netAmount,
            `"${(p.notes || '').replace(/"/g, '""')}"`,
          ].join(',') + '\n'
        }
        break
      }

      case 'pnl': {
        const adminId = getTenantAdminId(user)
        const range = dateFrom && dateTo
          ? getCustomRange(dateFrom, dateTo)
          : getAnnualRange(new Date().getFullYear())

        const report = await calculateProfitLoss(adminId, range)

        csv = 'Category,Amount\n'
        csv += `Total Revenue,${report.revenue.total}\n`
        for (const [cat, amt] of Object.entries(report.revenue.byCategory)) {
          csv += `Revenue - ${cat},${amt}\n`
        }
        csv += `Total Expenses,${report.expenses.total}\n`
        for (const [cat, amt] of Object.entries(report.expenses.byCategory)) {
          csv += `Expense - ${cat},${amt}\n`
        }
        csv += `Total Payroll,${report.payroll.total}\n`
        csv += `Net Profit,${report.netProfit}\n`
        csv += `Margin,${(report.margin * 100).toFixed(2)}%\n`
        break
      }

      default:
        throw createError({ statusCode: 400, message: 'Invalid export type. Use: expenses, revenue, payroll, or pnl' })
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `bookkeeping-${type}-${timestamp}.csv`

    event.node.res.setHeader('Content-Type', 'text/csv')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    return csv
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

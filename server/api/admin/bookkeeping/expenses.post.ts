import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      vendor,
      date,
      total,
      receiptNumber,
      subtotal,
      gstAmount,
      hstAmount,
      pstAmount,
      taxAmount,
      category,
      description,
      receiptUrl,
      paymentMethod,
      ocrRawData,
    } = body

    if (!vendor || !date || total === undefined || total === null) {
      throw createError({ statusCode: 400, message: 'vendor, date, and total are required' })
    }

    const expense = await prisma.bkExpense.create({
      data: {
        vendor,
        date: new Date(date),
        total: parseFloat(total),
        receiptNumber: receiptNumber || null,
        subtotal: subtotal ? parseFloat(subtotal) : null,
        gstAmount: gstAmount ? parseFloat(gstAmount) : null,
        hstAmount: hstAmount ? parseFloat(hstAmount) : null,
        pstAmount: pstAmount ? parseFloat(pstAmount) : null,
        taxAmount: taxAmount ? parseFloat(taxAmount) : null,
        category: category || 'general',
        description: description || null,
        receiptUrl: receiptUrl || null,
        paymentMethod: paymentMethod || null,
        ocrRawData: ocrRawData || null,
        adminId: getAdminIdForCreate(user),
        createdBy: user.id,
      },
    })

    return { success: true, expense }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error',
    })
  }
})

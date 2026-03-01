import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      date,
      amount,
      source,
      listingId,
      category,
      description,
      clientName,
      invoiceNumber,
    } = body

    if (!date || amount === undefined || amount === null) {
      throw createError({ statusCode: 400, message: 'date and amount are required' })
    }

    const revenue = await prisma.bkRevenue.create({
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        source: source || null,
        listingId: listingId || null,
        category: category || 'commission',
        description: description || null,
        clientName: clientName || null,
        invoiceNumber: invoiceNumber || null,
        adminId: getAdminIdForCreate(user),
        createdBy: user.id,
      },
    })

    return { success: true, revenue }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

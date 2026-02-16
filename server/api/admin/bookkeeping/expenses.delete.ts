import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const query = getQuery(event)
    const id = parseInt(query.id as string)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Expense ID is required' })
    }

    const existing = await prisma.bkExpense.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Expense not found' })
    }

    requireTenantAccess(user, existing.adminId)

    await prisma.bkExpense.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

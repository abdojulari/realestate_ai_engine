import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) throw createError({ statusCode: 400, message: 'Invalid transaction ID' })

    const transaction = await prisma.crmTransaction.findUnique({
      where: { id },
      include: {
        client: true,
        checklist: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!transaction) throw createError({ statusCode: 404, message: 'Transaction not found' })
    requireTenantAccess(user, transaction.adminId)

    return transaction
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

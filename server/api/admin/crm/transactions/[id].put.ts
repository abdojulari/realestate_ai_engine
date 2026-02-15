import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid transaction ID' })

    const existing = await prisma.crmTransaction.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Transaction not found' })
    requireTenantAccess(user, existing.adminId)

    const { status, propertyAddress, salePrice, closingDate, possessionDate, notes, currentStage } = body

    const transaction = await prisma.crmTransaction.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(propertyAddress !== undefined && { propertyAddress }),
        ...(salePrice !== undefined && { salePrice }),
        ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
        ...(possessionDate !== undefined && { possessionDate: possessionDate ? new Date(possessionDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(currentStage !== undefined && { currentStage }),
      },
      include: {
        client: true,
        checklist: { orderBy: { sortOrder: 'asc' } }
      }
    })

    return { success: true, transaction }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

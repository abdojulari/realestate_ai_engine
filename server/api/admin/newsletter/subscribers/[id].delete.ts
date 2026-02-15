import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })
    }

    // Verify tenant ownership before deleting
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existing) {
      throw createError({ statusCode: 404, message: 'Subscriber not found' })
    }

    await prisma.newsletterSubscriber.delete({ where: { id } })

    return {
      success: true,
      message: 'Subscriber deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting subscriber:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

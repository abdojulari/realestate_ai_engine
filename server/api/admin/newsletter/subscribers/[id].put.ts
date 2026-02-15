import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)
    const { email, firstName, lastName, status, tags } = body

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })
    }

    // Verify tenant ownership before updating
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existing) {
      throw createError({ statusCode: 404, message: 'Subscriber not found' })
    }

    const subscriber = await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        email: email ? email.toLowerCase() : undefined,
        firstName,
        lastName,
        status,
        tags: tags || null,
        unsubscribedAt: status === 'unsubscribed' ? new Date() : null
      }
    })

    return {
      success: true,
      message: 'Subscriber updated successfully',
      subscriber
    }
  } catch (error: any) {
    console.error('Error updating subscriber:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid template ID' })
    }

    const template = await prisma.newsletterTemplate.findFirst({
      where: { id, ...tenantFilter },
      include: { _count: { select: { newsletters: true } } }
    })

    if (!template) {
      throw createError({ statusCode: 404, message: 'Template not found' })
    }

    return template
  } catch (error: any) {
    console.error('Error fetching template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

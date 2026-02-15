import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) throw createError({ statusCode: 400, message: 'Invalid template ID' })

    const template = await prisma.listingTemplate.findUnique({ where: { id } })

    if (!template) throw createError({ statusCode: 404, message: 'Template not found' })

    requireTenantAccess(user, template.adminId)

    return template
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

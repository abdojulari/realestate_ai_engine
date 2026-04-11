import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid template ID' })
    }

    // Verify tenant ownership before deleting
    const existing = await prisma.newsletterTemplate.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existing) {
      throw createError({ statusCode: 404, message: 'Template not found' })
    }

    await prisma.newsletterTemplate.delete({ where: { id } })

    return {
      success: true,
      message: 'Template deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

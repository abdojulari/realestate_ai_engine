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
      throw createError({ statusCode: 400, message: 'Invalid automation ID' })
    }

    // Verify tenant ownership before deleting
    const existing = await prisma.newsletterAutomation.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existing) {
      throw createError({ statusCode: 404, message: 'Automation not found' })
    }

    await prisma.newsletterAutomation.delete({ where: { id } })

    return {
      success: true,
      message: 'Automation deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) throw createError({ statusCode: 400, message: 'Invalid template ID' })

    const existing = await prisma.listingTemplate.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Template not found' })
    requireTenantAccess(user, existing.adminId)

    await prisma.listingTemplate.delete({ where: { id } })

    return { success: true, message: 'Template deleted' }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

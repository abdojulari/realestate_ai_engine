import { defineEventHandler, getRouterParams } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const { id } = getRouterParams(event)
  const itemId = parseInt(id)

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ID' })
  }

  const existing = await prisma.flashNews.findUnique({ where: { id: itemId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Flash news not found' })
  }
  requireTenantAccess(user, existing.adminId)

  try {
    await prisma.flashNews.delete({ where: { id: itemId } })
    return { success: true }
  } catch (error) {
    console.error('[Admin FlashNews] Error deleting:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete flash news' })
  }
})

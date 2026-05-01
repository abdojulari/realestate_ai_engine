import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid rate ID' })

  const existing = await prisma.postedRate.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Rate not found' })
  requireTenantAccess(user, existing.adminId)

  await prisma.postedRate.delete({ where: { id } })
  return { success: true }
})

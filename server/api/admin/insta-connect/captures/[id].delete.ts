import { defineEventHandler, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid capture id' })
  }

  const capture = await prisma.instaConnectCapture.findUnique({
    where: { id },
    select: { id: true, adminId: true },
  })
  if (!capture) throw createError({ statusCode: 404, statusMessage: 'Capture not found' })
  requireTenantAccess(user, capture.adminId)

  await prisma.instaConnectCapture.delete({ where: { id: capture.id } })
  return { success: true }
})

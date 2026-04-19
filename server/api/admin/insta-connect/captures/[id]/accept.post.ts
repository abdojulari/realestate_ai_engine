import { defineEventHandler, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../../utils/auth'
import { getTenantAdminId, requireTenantAccess } from '../../../../../utils/tenant'
import { promoteCaptureToCrm } from '../../../../../utils/instaConnect'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Accept a pending InstaConnect capture: marks it accepted and upserts a CrmClient row.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getTenantAdminId(user)
  const id = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid capture id' })
  }

  const capture = await prisma.instaConnectCapture.findUnique({
    where: { id },
    select: { id: true, adminId: true, status: true },
  })
  if (!capture) throw createError({ statusCode: 404, statusMessage: 'Capture not found' })
  requireTenantAccess(user, capture.adminId)
  if (!adminId) throw createError({ statusCode: 403, statusMessage: 'No tenant context' })

  const result = await promoteCaptureToCrm(prisma, capture.id)
  return { success: true, ...result }
})

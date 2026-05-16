import { defineEventHandler, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId, requireSameTenantOnly } from '../../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantId = getTenantAdminId(user)
  if (tenantId == null) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant scope missing' })
  }

  const id = parseInt(getRouterParam(event, 'id') || '0', 10)
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const existing = await prisma.partnershipPromotion.findUnique({
    where: { id },
    select: { id: true, adminId: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Partner offer not found' })
  }
  requireSameTenantOnly(user, existing.adminId)

  await prisma.partnershipPromotion.delete({ where: { id } })

  return { ok: true }
})

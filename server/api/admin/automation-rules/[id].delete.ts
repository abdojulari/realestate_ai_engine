import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'
import { invalidateAutomationCache } from '../../../utils/automationEngine'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '', 10)
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

    const tenantFilter = getTenantFilter(user)
    const existing = await prisma.automationRule.findFirst({
      where: { id, ...tenantFilter },
    })
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Rule not found' })
    requireTenantAccess(user as any, existing.adminId)

    await prisma.automationRule.delete({ where: { id } })
    invalidateAutomationCache(existing.adminId)
    return { ok: true }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to delete rule' })
  }
})

import { defineEventHandler, readBody, createError } from 'h3'
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

    const body = await readBody<any>(event)
    const data: Record<string, unknown> = {}
    if (typeof body?.name === 'string') data.name = body.name.trim()
    if (typeof body?.description === 'string' || body?.description === null)
      data.description = body.description?.trim() || null
    if (typeof body?.enabled === 'boolean') data.enabled = body.enabled
    if (body?.trigger && typeof body.trigger === 'object' && body.trigger.type) data.trigger = body.trigger
    if (body?.action && typeof body.action === 'object' && body.action.type) data.action = body.action
    if (body?.cooldownSeconds === null || typeof body?.cooldownSeconds === 'number')
      data.cooldownSeconds = body.cooldownSeconds

    const rule = await prisma.automationRule.update({
      where: { id },
      data,
    })

    invalidateAutomationCache(rule.adminId)
    return { rule }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to update rule' })
  }
})

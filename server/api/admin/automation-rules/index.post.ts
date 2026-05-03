import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { invalidateAutomationCache } from '../../../utils/automationEngine'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface RuleInput {
  name?: string
  description?: string
  enabled?: boolean
  trigger?: any
  action?: any
  cooldownSeconds?: number | null
}

function validate(body: RuleInput): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body'
  if (!body.name || typeof body.name !== 'string') return 'name is required'
  if (!body.trigger || typeof body.trigger !== 'object') return 'trigger is required'
  if (!body.action || typeof body.action !== 'object') return 'action is required'
  if (!body.trigger.type) return 'trigger.type is required'
  if (!body.action.type) return 'action.type is required'
  return null
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)
    const body = await readBody<RuleInput>(event)
    const error = validate(body)
    if (error) throw createError({ statusCode: 400, statusMessage: error })

    const rule = await prisma.automationRule.create({
      data: {
        adminId,
        name: body.name!.trim(),
        description: body.description?.trim() || null,
        enabled: body.enabled !== false,
        trigger: body.trigger as any,
        action: body.action as any,
        cooldownSeconds: body.cooldownSeconds ?? null,
      },
    })

    invalidateAutomationCache(adminId)
    return { rule }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create rule' })
  }
})

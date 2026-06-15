import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate, getTenantFilter } from '../../../../utils/tenant'
import { normalizeAudience, normalizeSubscriberIds } from '../../../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function calculateNextRun(frequency: string, dayOfWeek?: number, dayOfMonth?: number, timeOfDay?: string, _timezone?: string): Date {
  const now = new Date()
  const [hours, minutes] = (timeOfDay || '09:00').split(':').map(Number)

  const nextRun = new Date(now)
  nextRun.setHours(hours!, minutes!, 0, 0)

  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = nextRun.getDay()
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7
    nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7))
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    nextRun.setDate(dayOfMonth)
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1)
    }
  }

  return nextRun
}

/**
 * Build the JSON blob persisted in `NewsletterAutomation.targetFilters`.
 *
 * The schema only has columns for `templateId` + `subject`, but the UI also
 * needs to remember which campaign the admin picked as the source, the
 * audience selection ('all'|'new'|'inactive'|'specific'), and any specific
 * subscriber IDs. We pack those into the existing JSON column to avoid a
 * migration; the cron + run-now paths read the same shape back.
 */
function buildTargetFilters(input: {
  audience: unknown
  subscriberIds: unknown
  campaignId: unknown
}, tenantAdminId: number | undefined, allowedSubscriberIds: number[]): Record<string, unknown> {
  const audience = normalizeAudience(input.audience)
  const requested = normalizeSubscriberIds(input.subscriberIds)
  // Tenant scoping: drop any IDs that aren't owned by this tenant — prevents
  // a crafted payload from referencing another admin's subscriber IDs.
  const allowed = new Set(allowedSubscriberIds)
  const subscriberIds = requested.filter((id) => allowed.has(id))

  const campaignIdNum =
    typeof input.campaignId === 'number'
      ? input.campaignId
      : input.campaignId != null && !Number.isNaN(Number(input.campaignId))
      ? Number(input.campaignId)
      : null

  const filters: Record<string, unknown> = { audience }
  if (audience === 'specific') filters.subscriberIds = subscriberIds
  if (campaignIdNum) filters.campaignId = campaignIdNum
  if (tenantAdminId !== undefined) filters.tenantAdminId = tenantAdminId
  return filters
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const adminIdForCreate = getAdminIdForCreate(user)
    const body = await readBody(event)
    const {
      name,
      description,
      triggerType = 'time-based',
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone = 'America/New_York',
      templateId,
      campaignId,
      subject,
      audience,
      subscriberIds,
      isActive = true,
    } = body

    if (!name || !frequency) {
      throw createError({ statusCode: 400, message: 'Name and frequency are required' })
    }

    // Tenant-scope the template and campaign references — the UI shouldn't
    // be able to point an automation at another tenant's content.
    if (templateId) {
      const t = await prisma.newsletterTemplate.findFirst({ where: { id: Number(templateId), ...tenantFilter } })
      if (!t) throw createError({ statusCode: 400, message: 'Template not found' })
    }
    if (campaignId) {
      const c = await prisma.newsletter.findFirst({ where: { id: Number(campaignId), ...tenantFilter } })
      if (!c) throw createError({ statusCode: 400, message: 'Campaign not found' })
    }

    // Whitelist subscriber IDs against this tenant before persisting them.
    const requestedIds = normalizeSubscriberIds(subscriberIds)
    let allowedIds: number[] = []
    if (requestedIds.length > 0) {
      const rows = await prisma.newsletterSubscriber.findMany({
        where: { id: { in: requestedIds }, ...tenantFilter },
        select: { id: true },
      })
      allowedIds = rows.map((r) => r.id)
    }

    const targetFilters = buildTargetFilters(
      { audience, subscriberIds, campaignId },
      tenantFilter.adminId,
      allowedIds,
    )

    const nextRun = calculateNextRun(frequency, dayOfWeek, dayOfMonth, timeOfDay, timezone)

    const automation = await prisma.newsletterAutomation.create({
      data: {
        name,
        description,
        triggerType,
        frequency,
        dayOfWeek,
        dayOfMonth,
        timeOfDay,
        timezone,
        templateId: templateId ? Number(templateId) : null,
        subject,
        targetFilters: targetFilters as any,
        isActive,
        nextRun,
        createdBy: user.id,
        adminId: adminIdForCreate,
      },
    })

    return {
      success: true,
      message: 'Automation created successfully',
      automation,
    }
  } catch (error: any) {
    console.error('Error creating automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

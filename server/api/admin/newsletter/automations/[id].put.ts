import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
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

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid automation ID' })
    }

    const existingAutomation = await prisma.newsletterAutomation.findFirst({
      where: { id, ...tenantFilter },
    })

    if (!existingAutomation) {
      throw createError({ statusCode: 404, message: 'Automation not found' })
    }

    const {
      name,
      description,
      triggerType,
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone,
      templateId,
      campaignId,
      subject,
      audience,
      subscriberIds,
      isActive,
    } = body

    // Tenant-scope template and campaign references on update too.
    if (templateId) {
      const t = await prisma.newsletterTemplate.findFirst({ where: { id: Number(templateId), ...tenantFilter } })
      if (!t) throw createError({ statusCode: 400, message: 'Template not found' })
    }
    if (campaignId) {
      const c = await prisma.newsletter.findFirst({ where: { id: Number(campaignId), ...tenantFilter } })
      if (!c) throw createError({ statusCode: 400, message: 'Campaign not found' })
    }

    let nextRun: Date | undefined
    if (frequency || dayOfWeek !== undefined || dayOfMonth !== undefined || timeOfDay) {
      nextRun = calculateNextRun(
        frequency || existingAutomation.frequency || 'weekly',
        dayOfWeek !== undefined ? dayOfWeek : existingAutomation.dayOfWeek || undefined,
        dayOfMonth !== undefined ? dayOfMonth : existingAutomation.dayOfMonth || undefined,
        timeOfDay || existingAutomation.timeOfDay || '09:00',
        timezone || existingAutomation.timezone,
      )
    }

    // Only rebuild targetFilters when the audience or source changes.
    // Toggling `isActive` should not silently wipe the saved audience.
    const audienceProvided =
      audience !== undefined || subscriberIds !== undefined || campaignId !== undefined
    let targetFiltersUpdate: any = undefined
    if (audienceProvided) {
      const normalized = normalizeAudience(
        audience !== undefined ? audience : (existingAutomation.targetFilters as any)?.audience,
      )
      let cleanIds: number[] = []
      if (normalized === 'specific') {
        const rawIds =
          subscriberIds !== undefined
            ? subscriberIds
            : (existingAutomation.targetFilters as any)?.subscriberIds
        const requested = normalizeSubscriberIds(rawIds)
        if (requested.length > 0) {
          const rows = await prisma.newsletterSubscriber.findMany({
            where: { id: { in: requested }, ...tenantFilter },
            select: { id: true },
          })
          cleanIds = rows.map((r) => r.id)
        }
      }
      const campaignIdNum =
        campaignId !== undefined
          ? campaignId
            ? Number(campaignId)
            : null
          : (existingAutomation.targetFilters as any)?.campaignId ?? null

      const filters: Record<string, unknown> = { audience: normalized }
      if (normalized === 'specific') filters.subscriberIds = cleanIds
      if (campaignIdNum) filters.campaignId = campaignIdNum
      if (tenantFilter.adminId !== undefined) filters.tenantAdminId = tenantFilter.adminId
      targetFiltersUpdate = filters
    }

    const automation = await prisma.newsletterAutomation.update({
      where: { id },
      data: {
        name,
        description,
        triggerType,
        frequency,
        dayOfWeek,
        dayOfMonth,
        timeOfDay,
        timezone,
        templateId: templateId !== undefined ? (templateId ? Number(templateId) : null) : undefined,
        subject,
        targetFilters: targetFiltersUpdate,
        isActive,
        nextRun,
      },
    })

    return {
      success: true,
      message: 'Automation updated successfully',
      automation,
    }
  } catch (error: any) {
    console.error('Error updating automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

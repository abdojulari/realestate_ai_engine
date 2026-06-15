import { requireAdmin } from '../../../../../utils/auth'
import { getTenantFilter } from '../../../../../utils/tenant'
import { dispatchNewsletter } from '../../../../../utils/newsletterDispatch'
import { normalizeAudience, normalizeSubscriberIds } from '../../../../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Manually trigger an existing automation's send right now.
 *
 * Same content + audience config that the cron would have used at the next
 * scheduled run. Useful when the admin wants to fire off the automation
 * without waiting (e.g. a "Send Now" action on the automation card). Updates
 * `lastRun` and `runCount` so the dashboard reflects the manual run.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')
    if (!id) throw createError({ statusCode: 400, message: 'Invalid automation ID' })

    const automation = await prisma.newsletterAutomation.findFirst({
      where: { id, ...tenantFilter },
    })
    if (!automation || automation.adminId == null) {
      throw createError({ statusCode: 404, message: 'Automation not found' })
    }

    // Defense-in-depth: the findFirst above already enforces tenant ownership,
    // but assert again so the dispatcher can never be invoked on a foreign row
    // even if this code is later refactored.
    if (
      tenantFilter.adminId == null ||
      automation.adminId !== tenantFilter.adminId
    ) {
      throw createError({ statusCode: 403, message: 'Tenant mismatch' })
    }

    const filters = (automation.targetFilters as any) || {}
    const audience = normalizeAudience(filters.audience)
    const subscriberIds = normalizeSubscriberIds(filters.subscriberIds)
    const campaignId = filters.campaignId ? Number(filters.campaignId) : null

    const result = await dispatchNewsletter({
      adminId: automation.adminId,
      createdBy: automation.createdBy ?? user.id,
      campaignId,
      templateId: automation.templateId ?? null,
      subject: automation.subject ?? null,
      audience,
      subscriberIds,
      name: automation.name,
      sourceLabel: `Automation: ${automation.name}`,
    })

    await prisma.newsletterAutomation.update({
      where: { id: automation.id },
      data: {
        lastRun: new Date(),
        runCount: automation.runCount + 1,
      },
    })

    return result
  } catch (error: any) {
    console.error('Error running automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

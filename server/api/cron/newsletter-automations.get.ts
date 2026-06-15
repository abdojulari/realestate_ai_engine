import { dispatchNewsletter } from '../../utils/newsletterDispatch'
import { normalizeAudience, normalizeSubscriberIds } from '../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Cron endpoint that runs newsletter automations whose `nextRun <= now`.
 *
 * Hit this periodically (e.g. once an hour) from an external scheduler:
 *   curl https://platform.example/api/cron/newsletter-automations?secret=$CRON_SECRET
 *
 * Tenancy: this endpoint loops over every tenant's automations, but every
 * downstream query (subscribers, template lookup, campaign create, email
 * send) is scoped to `automation.adminId`. A tonahomes automation can NEVER
 * mail temi360's subscribers, even though the cron itself runs without an
 * authenticated user.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const cronSecret = process.env.CRON_SECRET || 'change-me-in-production'

    if (query.secret !== cronSecret) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const now = new Date()
    console.log(`[Newsletter Automation] Running check at ${now.toISOString()}`)

    const dueAutomations = await prisma.newsletterAutomation.findMany({
      where: {
        isActive: true,
        nextRun: { lte: now },
      },
    })

    console.log(`[Newsletter Automation] Found ${dueAutomations.length} due automations`)

    const results: Array<Record<string, unknown>> = []

    for (const automation of dueAutomations) {
      try {
        console.log(
          `[Newsletter Automation] Processing automation ${automation.id} (${automation.name}) tenant=${automation.adminId}`,
        )

        if (automation.adminId == null) {
          // Defensive: a NULL-tenant automation is malformed — refuse to send.
          // Otherwise we'd cross-tenant blast every subscriber on the platform.
          console.warn(`[Newsletter Automation] Skipping automation ${automation.id}: no adminId`)
          results.push({ automationId: automation.id, success: false, error: 'Missing adminId' })
          continue
        }

        const filters = (automation.targetFilters as any) || {}
        const audience = normalizeAudience(filters.audience)
        const subscriberIds = normalizeSubscriberIds(filters.subscriberIds)
        const campaignId = filters.campaignId ? Number(filters.campaignId) : null

        let dispatchResult: Awaited<ReturnType<typeof dispatchNewsletter>> | null = null
        try {
          dispatchResult = await dispatchNewsletter({
            adminId: automation.adminId,
            createdBy: automation.createdBy ?? null,
            campaignId,
            templateId: automation.templateId ?? null,
            subject: automation.subject ?? null,
            audience,
            subscriberIds,
            name: automation.name,
            sourceLabel: `Automation: ${automation.name}`,
          })
        } catch (e: any) {
          // dispatchNewsletter throws on "no recipients" too — surface it but
          // still advance the schedule so we don't tight-loop on empty audiences.
          console.warn(
            `[Newsletter Automation] Dispatch skipped for ${automation.id}: ${e?.message || e}`,
          )
        }

        const nextRun = calculateNextRun(automation)
        await prisma.newsletterAutomation.update({
          where: { id: automation.id },
          data: {
            lastRun: now,
            nextRun,
            runCount: automation.runCount + (dispatchResult ? 1 : 0),
          },
        })

        if (dispatchResult) {
          results.push({
            automationId: automation.id,
            automationName: automation.name,
            campaignId: dispatchResult.campaignId,
            success: true,
            sent: dispatchResult.emailsSent,
            failed: dispatchResult.emailsFailed,
            status: dispatchResult.status,
            nextRun: nextRun.toISOString(),
          })
        } else {
          results.push({
            automationId: automation.id,
            automationName: automation.name,
            success: true,
            sent: 0,
            failed: 0,
            nextRun: nextRun.toISOString(),
          })
        }
      } catch (error) {
        console.error(`[Newsletter Automation] Error processing automation ${automation.id}:`, error)
        results.push({
          automationId: automation.id,
          automationName: automation.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      success: true,
      timestamp: now.toISOString(),
      processed: dueAutomations.length,
      results,
    }
  } catch (error: any) {
    console.error('[Newsletter Automation] Cron job error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

function calculateNextRun(automation: any): Date {
  const now = new Date()
  const [hours, minutes] = (automation.timeOfDay || '09:00').split(':').map(Number)

  const nextRun = new Date(now)
  nextRun.setHours(hours!, minutes!, 0, 0)

  if (automation.frequency === 'daily') {
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1)
  } else if (automation.frequency === 'weekly' && automation.dayOfWeek !== undefined && automation.dayOfWeek !== null) {
    const currentDay = nextRun.getDay()
    const targetDay = automation.dayOfWeek
    let daysUntilTarget = (targetDay - currentDay + 7) % 7
    if (daysUntilTarget === 0 && nextRun <= now) daysUntilTarget = 7
    nextRun.setDate(nextRun.getDate() + daysUntilTarget)
  } else if (automation.frequency === 'monthly' && automation.dayOfMonth) {
    nextRun.setDate(automation.dayOfMonth)
    if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1)
  }

  return nextRun
}

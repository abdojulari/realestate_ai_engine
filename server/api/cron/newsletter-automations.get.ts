import { sendNewsletterBatch } from '../../utils/email'
import { sanitizeEmailHtml } from '../../utils/emailHtmlSanitize'
import { buildAudienceWhere, normalizeAudience } from '../../utils/newsletterAudience'
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
        console.log(`[Newsletter Automation] Processing automation ${automation.id} (${automation.name}) tenant=${automation.adminId}`)

        if (automation.adminId == null) {
          // Defensive: a NULL-tenant automation is malformed — refuse to send.
          // Otherwise we'd cross-tenant blast every subscriber on the platform.
          console.warn(`[Newsletter Automation] Skipping automation ${automation.id}: no adminId`)
          results.push({ automationId: automation.id, success: false, error: 'Missing adminId' })
          continue
        }

        const tenantFilter = { adminId: automation.adminId }
        const audience = normalizeAudience((automation.targetFilters as any)?.audience)
        const where = buildAudienceWhere(audience, tenantFilter)

        const subscribers = await prisma.newsletterSubscriber.findMany({
          where,
          select: { id: true, email: true, firstName: true, lastName: true },
        })

        if (subscribers.length === 0) {
          console.log(`[Newsletter Automation] No subscribers for automation ${automation.id}`)
          // Still advance the schedule so we don't tight-loop on empty audiences.
          const nextRun = calculateNextRun(automation)
          await prisma.newsletterAutomation.update({
            where: { id: automation.id },
            data: { lastRun: now, nextRun, runCount: automation.runCount + 1 },
          })
          results.push({ automationId: automation.id, success: true, sent: 0, failed: 0, nextRun: nextRun.toISOString() })
          continue
        }

        // Tenant-scoped template lookup so a misconfigured automation can't
        // be tricked into sending another tenant's template body.
        let template: { subject: string; content: string; plainTextContent: string | null } | null = null
        if (automation.templateId) {
          template = await prisma.newsletterTemplate.findFirst({
            where: { id: automation.templateId, ...tenantFilter },
            select: { subject: true, content: true, plainTextContent: true },
          })
        }

        const rawContent = template?.content || '<p>Newsletter content</p>'
        const safeHtml = sanitizeEmailHtml(rawContent)

        const campaign = await prisma.newsletter.create({
          data: {
            name: `${automation.name} - ${now.toISOString()}`,
            subject: automation.subject || template?.subject || 'Newsletter Update',
            content: rawContent,
            plainTextContent: template?.plainTextContent || null,
            status: 'sending',
            recipientCount: subscribers.length,
            frequency: automation.frequency || null,
            adminId: automation.adminId,
            createdBy: automation.createdBy ?? null,
            targetFilters: { audience },
          },
        })

        const sendResults = await sendNewsletterBatch(
          subscribers,
          {
            id: campaign.id,
            subject: campaign.subject,
            content: safeHtml,
            plainTextContent: campaign.plainTextContent || undefined,
          },
          { adminId: automation.adminId },
        )

        const failedEmails = new Set(
          (sendResults.errors || []).map((e: any) => String(e?.email || '').toLowerCase()),
        )
        const sentRecords = subscribers.map((subscriber) => ({
          newsletterId: campaign.id,
          subscriberId: subscriber.id,
          status: failedEmails.has(subscriber.email.toLowerCase()) ? 'failed' : 'sent',
          sentAt: new Date(),
        }))
        await prisma.sentNewsletter.createMany({ data: sentRecords })

        let finalStatus: 'sent' | 'failed' | 'partial_sent' = 'sent'
        if (sendResults.failed > 0 && sendResults.success === 0) finalStatus = 'failed'
        else if (sendResults.failed > 0) finalStatus = 'partial_sent'

        await prisma.newsletter.update({
          where: { id: campaign.id },
          data: { status: finalStatus, sentAt: new Date(), recipientCount: subscribers.length },
        })

        const nextRun = calculateNextRun(automation)
        await prisma.newsletterAutomation.update({
          where: { id: automation.id },
          data: { lastRun: now, nextRun, runCount: automation.runCount + 1 },
        })

        results.push({
          automationId: automation.id,
          automationName: automation.name,
          campaignId: campaign.id,
          success: true,
          sent: sendResults.success,
          failed: sendResults.failed,
          status: finalStatus,
          nextRun: nextRun.toISOString(),
        })
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

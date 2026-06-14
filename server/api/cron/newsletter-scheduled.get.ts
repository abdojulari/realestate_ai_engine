import { sendNewsletterBatch } from '../../utils/email'
import { sanitizeEmailHtml } from '../../utils/emailHtmlSanitize'
import { buildAudienceWhere, normalizeAudience } from '../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Picks up campaigns the admin saved with status='scheduled' and
 * `scheduledFor <= now` and sends them. Without this worker the
 * "Schedule for Later" option in the campaign builder is a no-op:
 * the campaign is written to the DB but never delivered.
 *
 * Hit periodically (e.g. every minute) from your scheduler:
 *   curl https://platform.example/api/cron/newsletter-scheduled?secret=$CRON_SECRET
 *
 * Tenancy: each Newsletter row carries `adminId`; we send under that
 * tenant's branded From and only to that tenant's subscribers. The cron
 * itself runs without an authenticated user but does not need tenant
 * impersonation — every per-row operation is scoped by `adminId`.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const cronSecret = process.env.CRON_SECRET || 'change-me-in-production'

    if (query.secret !== cronSecret) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const now = new Date()
    console.log(`[Newsletter Scheduled] Running at ${now.toISOString()}`)

    const due = await prisma.newsletter.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: { lte: now },
        adminId: { not: null },
      },
    })

    console.log(`[Newsletter Scheduled] Found ${due.length} due campaigns`)

    const results: Array<Record<string, unknown>> = []

    for (const campaign of due) {
      try {
        if (campaign.adminId == null) {
          // Belt-and-braces guard — the WHERE clause already excluded these.
          results.push({ campaignId: campaign.id, success: false, error: 'Missing adminId' })
          continue
        }

        // Mark as sending so a long-running send doesn't get double-picked
        // by an overlapping cron tick.
        await prisma.newsletter.update({
          where: { id: campaign.id },
          data: { status: 'sending' },
        })

        const tenantFilter = { adminId: campaign.adminId }
        const audience = normalizeAudience((campaign.targetFilters as any)?.audience)
        const where = buildAudienceWhere(audience, tenantFilter)

        const subscribers = await prisma.newsletterSubscriber.findMany({
          where,
          select: { id: true, email: true, firstName: true, lastName: true },
        })

        if (subscribers.length === 0) {
          await prisma.newsletter.update({
            where: { id: campaign.id },
            data: { status: 'sent', sentAt: new Date(), recipientCount: 0 },
          })
          results.push({ campaignId: campaign.id, success: true, sent: 0, failed: 0, note: 'no subscribers' })
          continue
        }

        const safeHtml = sanitizeEmailHtml(campaign.content)

        const sendResults = await sendNewsletterBatch(
          subscribers,
          {
            id: campaign.id,
            subject: campaign.subject,
            content: safeHtml,
            plainTextContent: campaign.plainTextContent || undefined,
            attachments: campaign.attachments,
          },
          { adminId: campaign.adminId },
        )

        const failedEmails = new Set(
          (sendResults.errors || []).map((e: any) => String(e?.email || '').toLowerCase()),
        )
        const sentRecords = subscribers.map((s) => ({
          newsletterId: campaign.id,
          subscriberId: s.id,
          status: failedEmails.has(s.email.toLowerCase()) ? 'failed' : 'sent',
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

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: true,
          sent: sendResults.success,
          failed: sendResults.failed,
          status: finalStatus,
        })
      } catch (err) {
        console.error(`[Newsletter Scheduled] Error processing campaign ${campaign.id}:`, err)
        // Don't leave the campaign permanently stuck in 'sending'. Roll back
        // so an admin can re-trigger from the dashboard once they fix the issue.
        await prisma.newsletter
          .update({ where: { id: campaign.id }, data: { status: 'draft' } })
          .catch(() => {})
        results.push({
          campaignId: campaign.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return {
      success: true,
      timestamp: now.toISOString(),
      processed: due.length,
      results,
    }
  } catch (error: any) {
    console.error('[Newsletter Scheduled] Cron error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

/**
 * Shared dispatch helper for newsletter "send now" flows.
 *
 * Both the manual-run endpoint (`/automations/[id]/run`) and the ad-hoc
 * instant-send endpoint (`/automations/send-now`) need the same plumbing:
 *
 *   1. Resolve content from a Campaign or a Template (tenant-scoped).
 *   2. Resolve the recipient list from an audience selector (`all` / `new`
 *      / `inactive` / `specific` subscriber IDs), within the tenant.
 *   3. Create a Newsletter row to attach SentNewsletter records to (so opens
 *      / clicks / unsubscribes can be tracked back to the send).
 *   4. Sanitize the HTML and fan out via `sendNewsletterBatch`.
 *   5. Roll up per-recipient results into a final campaign status.
 *
 * Centralizing this avoids the two endpoints drifting (and forgetting things
 * like sanitization or per-recipient failure tracking).
 */
import { createError } from 'h3'
import { sendNewsletterBatch } from './email'
import { sanitizeEmailHtml } from './emailHtmlSanitize'
import { buildAudienceWhere, normalizeAudience, normalizeSubscriberIds } from './newsletterAudience'
import type { NewsletterAudience } from './newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

export interface DispatchInput {
  adminId: number
  createdBy?: number | null
  /** Source: either a campaign id or template id (campaign takes priority). */
  campaignId?: number | null
  templateId?: number | null
  /** Direct content fallback if neither campaign nor template is provided. */
  subject?: string | null
  content?: string | null
  plainTextContent?: string | null
  /** Optional name override (used as the Newsletter row's `name`). */
  name?: string | null
  audience: NewsletterAudience
  subscriberIds?: number[]
  /** Pretty label baked into the Newsletter row name (e.g. "Automation: X"). */
  sourceLabel?: string
}

export interface DispatchResult {
  success: boolean
  message: string
  campaignId: number
  recipientCount: number
  emailsSent: number
  emailsFailed: number
  status: 'sent' | 'failed' | 'partial_sent'
}

/**
 * Resolve, sanitize, persist and send. Returns aggregate delivery info.
 *
 * Strict tenancy: every read/write is keyed off `input.adminId`. Subscriber
 * IDs supplied by the caller are re-checked against the tenant before they
 * become recipients — a rogue payload pointing at another tenant's IDs will
 * silently drop those IDs (and 400 if nothing remains).
 */
export async function dispatchNewsletter(input: DispatchInput): Promise<DispatchResult> {
  // Hard tenant gate. The dispatcher is the last line of defense before mail
  // actually goes out — refuse rather than risk a cross-tenant blast even if
  // an upstream caller forgot to validate.
  if (!Number.isInteger(input.adminId) || input.adminId <= 0) {
    throw createError({
      statusCode: 500,
      message: 'dispatchNewsletter called without a valid tenant adminId',
    })
  }
  const tenantFilter = { adminId: input.adminId }

  // 1. Resolve content source.
  let subject = input.subject || ''
  let rawContent = input.content || ''
  let plainText = input.plainTextContent || null
  let contentName = input.name || null
  let attachments: any = null

  if (input.campaignId) {
    const campaign = await prisma.newsletter.findFirst({
      where: { id: input.campaignId, ...tenantFilter },
    })
    if (!campaign) {
      throw createError({ statusCode: 400, message: 'Selected campaign not found' })
    }
    subject = subject || campaign.subject
    rawContent = rawContent || campaign.content
    plainText = plainText || campaign.plainTextContent || null
    contentName = contentName || campaign.name
    attachments = campaign.attachments ?? null
  } else if (input.templateId) {
    const template = await prisma.newsletterTemplate.findFirst({
      where: { id: input.templateId, ...tenantFilter },
    })
    if (!template) {
      throw createError({ statusCode: 400, message: 'Selected template not found' })
    }
    subject = subject || template.subject
    rawContent = rawContent || template.content
    plainText = plainText || template.plainTextContent || null
    contentName = contentName || template.name
    attachments = template.attachments ?? null
  }

  if (!rawContent) {
    throw createError({
      statusCode: 400,
      message: 'No content to send. Pick a campaign or template, or provide content.',
    })
  }
  if (!subject) {
    throw createError({ statusCode: 400, message: 'Email subject is required' })
  }

  // 2. Resolve recipients.
  const audience = normalizeAudience(input.audience)
  const requestedIds = normalizeSubscriberIds(input.subscriberIds)
  const where = buildAudienceWhere(audience, tenantFilter, requestedIds)

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, adminId: true },
  })

  // Defense-in-depth: assert every recipient belongs to this tenant. The
  // `where` already enforces this, but a corrupted index or a future code
  // path that re-uses this list shouldn't be able to mail a foreign row.
  for (const sub of subscribers) {
    if (sub.adminId !== input.adminId) {
      throw createError({
        statusCode: 500,
        message: 'Tenant integrity check failed for subscriber resolution',
      })
    }
  }

  if (subscribers.length === 0) {
    throw createError({
      statusCode: 400,
      message:
        audience === 'specific'
          ? 'None of the selected subscribers belong to this account or are still active.'
          : 'No active subscribers match this audience.',
    })
  }

  // 3. Create the Newsletter row up front so SentNewsletter rows have a target.
  const safeHtml = sanitizeEmailHtml(rawContent)
  const now = new Date()
  const sourceLabel = input.sourceLabel ?? 'Instant Send'
  const namePrefix = contentName ? `${sourceLabel}: ${contentName}` : sourceLabel

  // Persist only the IDs that actually survived the tenant filter — never
  // the raw caller-supplied list. This prevents foreign IDs from being
  // logged into our own tenant's audit trail.
  const resolvedIds = subscribers.map((s) => s.id)

  const campaign = await prisma.newsletter.create({
    data: {
      name: `${namePrefix} — ${now.toISOString()}`,
      subject,
      content: rawContent,
      plainTextContent: plainText,
      status: 'sending',
      recipientCount: subscribers.length,
      attachments: attachments ?? undefined,
      adminId: input.adminId,
      createdBy: input.createdBy ?? null,
      targetFilters: {
        audience,
        ...(audience === 'specific' ? { subscriberIds: resolvedIds } : {}),
      } as any,
    },
  })

  // 4. Fan out.
  const sendResults = await sendNewsletterBatch(
    subscribers,
    {
      id: campaign.id,
      subject,
      content: safeHtml,
      plainTextContent: plainText || undefined,
      attachments: attachments ?? undefined,
    },
    { adminId: input.adminId },
  )

  // 5. Per-recipient + aggregate status.
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

  return {
    success: true,
    message: `Sent to ${sendResults.success} of ${subscribers.length} subscribers`,
    campaignId: campaign.id,
    recipientCount: subscribers.length,
    emailsSent: sendResults.success,
    emailsFailed: sendResults.failed,
    status: finalStatus,
  }
}

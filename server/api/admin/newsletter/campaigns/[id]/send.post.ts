import { requireAdmin } from '../../../../../utils/auth'
import { getTenantAdminId, getTenantFilter } from '../../../../../utils/tenant'
import { sendEmail, sendNewsletterBatch } from '../../../../../utils/email'
import { sanitizeEmailHtml } from '../../../../../utils/emailHtmlSanitize'
import { buildAudienceWhere, normalizeAudience } from '../../../../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const adminId = getTenantAdminId(user)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid campaign ID' })
    }

    const body = await readBody(event)
    const { testMode = false, testEmail } = body

    const campaign = await prisma.newsletter.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!campaign) {
      throw createError({ statusCode: 404, message: 'Campaign not found' })
    }

    if (campaign.status === 'sent') {
      throw createError({ statusCode: 400, message: 'Campaign has already been sent' })
    }

    // Sanitize once up front — both test sends and real sends use it.
    const safeHtml = sanitizeEmailHtml(campaign.content)

    if (testMode && testEmail) {
      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: safeHtml,
        text: campaign.plainTextContent || undefined,
        adminId,
      })
      return { success: true, message: `Test email sent to ${testEmail}`, testMode: true }
    }

    await prisma.newsletter.update({
      where: { id },
      data: { status: 'sending' }
    })

    const audience = normalizeAudience((campaign.targetFilters as any)?.audience)
    const where = buildAudienceWhere(audience, tenantFilter)

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    if (subscribers.length === 0) {
      await prisma.newsletter.update({ where: { id }, data: { status: 'draft' } })
      throw createError({ statusCode: 400, message: 'No subscribers match the target audience' })
    }

    const emailResults = await sendNewsletterBatch(
      subscribers,
      {
        id: campaign.id,
        subject: campaign.subject,
        content: safeHtml,
        plainTextContent: campaign.plainTextContent || undefined,
        attachments: campaign.attachments
      },
      { adminId }
    )

    // Per-recipient SentNewsletter status reflects actual delivery, not a
    // blanket 'sent'. Failed recipients can be retried / inspected later.
    const failedEmails = new Set(
      (emailResults.errors || []).map((e: any) => String(e?.email || '').toLowerCase())
    )
    const sentRecords = subscribers.map(subscriber => {
      const didFail = failedEmails.has(subscriber.email.toLowerCase())
      return {
        newsletterId: campaign.id,
        subscriberId: subscriber.id,
        status: didFail ? 'failed' : 'sent',
        sentAt: new Date(),
      }
    })
    await prisma.sentNewsletter.createMany({ data: sentRecords })

    // Campaign final status reflects aggregate delivery:
    //  • all-success  → 'sent'
    //  • all-failed   → 'failed'
    //  • some-failed  → 'partial_sent' (admins can re-drive failed rows later)
    let finalStatus: 'sent' | 'failed' | 'partial_sent' = 'sent'
    if (emailResults.failed > 0 && emailResults.success === 0) finalStatus = 'failed'
    else if (emailResults.failed > 0) finalStatus = 'partial_sent'

    await prisma.newsletter.update({
      where: { id },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        recipientCount: subscribers.length,
      }
    })

    return {
      success: true,
      message: `Campaign sent to ${emailResults.success} of ${subscribers.length} subscribers`,
      recipientCount: subscribers.length,
      emailsSent: emailResults.success,
      emailsFailed: emailResults.failed,
      status: finalStatus,
    }
  } catch (error: any) {
    console.error('Error sending campaign:', error)
    const id = parseInt(event.context.params?.id || '0')
    if (id) {
      await prisma.newsletter.update({
        where: { id },
        data: { status: 'draft' }
      }).catch(() => {})
    }
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

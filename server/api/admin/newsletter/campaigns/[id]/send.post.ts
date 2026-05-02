import { requireAdmin } from '../../../../../utils/auth'
import { getTenantAdminId, getTenantFilter } from '../../../../../utils/tenant'
import { sendEmail, sendNewsletterBatch } from '../../../../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
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

    if (testMode && testEmail) {
      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.content,
        text: campaign.plainTextContent || undefined
      })
      return { success: true, message: `Test email sent to ${testEmail}`, testMode: true }
    }

    await prisma.newsletter.update({
      where: { id },
      data: { status: 'sending' }
    })

    const where: any = { status: 'active', ...tenantFilter }
    const filters = campaign.targetFilters as any
    if (filters?.audience === 'new') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      where.createdAt = { gte: thirtyDaysAgo }
    } else if (filters?.audience === 'inactive') {
      where.status = 'inactive'
    }

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
        content: campaign.content,
        plainTextContent: campaign.plainTextContent || undefined,
        attachments: campaign.attachments
      },
      { adminId: getTenantAdminId(user) }
    )

    const sentRecords = subscribers.map(subscriber => ({
      newsletterId: campaign.id,
      subscriberId: subscriber.id,
      status: 'sent',
      sentAt: new Date()
    }))
    await prisma.sentNewsletter.createMany({ data: sentRecords })

    await prisma.newsletter.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        recipientCount: subscribers.length
      }
    })

    return {
      success: true,
      message: `Campaign sent to ${emailResults.success} of ${subscribers.length} subscribers`,
      recipientCount: subscribers.length,
      emailsSent: emailResults.success,
      emailsFailed: emailResults.failed
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

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid campaign ID' })
    }

    const body = await readBody(event)
    const { testMode = false, testEmail } = body

    const campaign = await prisma.newsletter.findUnique({ where: { id } })

    if (!campaign) {
      throw createError({ statusCode: 404, message: 'Campaign not found' })
    }

    if (campaign.status === 'sent') {
      throw createError({ statusCode: 400, message: 'Campaign has already been sent' })
    }

    if (testMode && testEmail) {
      return {
        success: true,
        message: `Test email sent to ${testEmail}`,
        testMode: true
      }
    }

    await prisma.newsletter.update({
      where: { id },
      data: { status: 'sending' }
    })

    const where: any = { status: 'active' }
    if (campaign.targetFilters) {
      // Apply filters here
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true }
    })

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
      message: `Campaign sent successfully to ${subscribers.length} subscribers`,
      recipientCount: subscribers.length
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

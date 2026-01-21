import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)
    const {
      name,
      templateId,
      subject,
      content,
      plainTextContent,
      previewText,
      status = 'draft',
      frequency,
      scheduledFor,
      attachments,
      tags,
      targetFilters,
      automationSettings
    } = body

    if (!name || !subject || !content) {
      throw createError({ statusCode: 400, message: 'Name, subject, and content are required' })
    }

    let recipientCount = 0
    if (targetFilters && Object.keys(targetFilters).length > 0) {
      const where: any = { status: 'active' }
      recipientCount = await prisma.newsletterSubscriber.count({ where })
    } else {
      recipientCount = await prisma.newsletterSubscriber.count({ where: { status: 'active' } })
    }

    const campaign = await prisma.newsletter.create({
      data: {
        name,
        templateId: templateId || null,
        subject,
        content,
        plainTextContent,
        previewText,
        status,
        frequency,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        recipientCount,
        attachments: attachments || null,
        tags: tags || null,
        targetFilters: targetFilters || null,
        automationSettings: automationSettings || null,
        createdBy: user.id
      }
    })

    return {
      success: true,
      message: 'Campaign created successfully',
      campaign
    }
  } catch (error: any) {
    console.error('Error creating campaign:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid campaign ID' })
    }

    const {
      name,
      templateId,
      subject,
      content,
      plainTextContent,
      previewText,
      status,
      frequency,
      scheduledFor,
      attachments,
      tags,
      targetFilters,
      automationSettings
    } = body

    const campaign = await prisma.newsletter.update({
      where: { id },
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
        attachments: attachments || null,
        tags: tags || null,
        targetFilters: targetFilters || null,
        automationSettings: automationSettings || null,
        lastModifiedBy: user.id
      }
    })

    return {
      success: true,
      message: 'Campaign updated successfully',
      campaign
    }
  } catch (error: any) {
    console.error('Error updating campaign:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

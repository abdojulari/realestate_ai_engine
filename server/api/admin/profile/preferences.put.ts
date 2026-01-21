import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.user?.id

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const body = await readBody(event)

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        timezone: body.timezone,
        language: body.language,
        emailNotifications: body.emailNotifications,
        pushNotifications: body.pushNotifications,
        smsNotifications: body.smsNotifications
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'settings_update',
        entity: 'preferences',
        entityId: userId,
        description: 'Updated notification preferences',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update preferences'
    })
  }
})


import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.user?.id

    if (!userId) {
      // If not authenticated, just return success
      return { success: true }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'logout',
        description: 'Logged out successfully',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    return { success: true, message: 'Logged out successfully' }
  } catch (error: any) {
    console.error('Error during logout:', error)
    // Don't throw error on logout, just return success
    return { success: true }
  }
})


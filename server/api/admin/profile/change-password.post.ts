import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Current password and new password are required'
      })
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        email: true
      }
    })

    if (!user || !user.password) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Current password is incorrect'
      })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'password_change',
        entity: 'user',
        entityId: userId,
        description: 'Changed password',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    // TODO: Send email notification about password change

    return { success: true, message: 'Password changed successfully' }
  } catch (error: any) {
    console.error('Error changing password:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to change password'
    })
  }
})


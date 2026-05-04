import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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

    // Log activity — fire-and-forget. The password is already committed above
    // and a logging hiccup (transient DB blip, oversized user-agent, pool
    // exhaustion) must NEVER turn a successful change into a 500 the user
    // sees as "Failed to change password".
    try {
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
    } catch (logErr) {
      console.error('Failed to write password_change activity log (non-fatal):', logErr)
    }

    // Send email notification about password change
    try {
      const { queueEmail } = await import('../../../utils/emailQueue')
      await queueEmail({
        to: user.email,
        subject: 'Password Changed - Security Alert',
        text: `Your password was changed on ${new Date().toLocaleString('en-CA')}. If you did not make this change, please contact support immediately.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Password Changed</h2>
            <p>Your account password was successfully changed on <strong>${new Date().toLocaleString('en-CA')}</strong>.</p>
            <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <strong>If you did not make this change</strong>, please contact support immediately to secure your account.
            </div>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('Failed to send password change notification:', emailErr)
    }

    return { success: true, message: 'Password changed successfully' }
  } catch (error: any) {
    console.error('Error changing password:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to change password'
    })
  }
})


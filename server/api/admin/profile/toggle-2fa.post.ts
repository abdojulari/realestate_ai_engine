import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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
    const { enabled } = body

    // Generate a secret for 2FA if enabling
    const twoFactorSecret = enabled ? crypto.randomBytes(32).toString('hex') : null

    // Update user 2FA status
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enabled,
        twoFactorSecret: enabled ? twoFactorSecret : null,
        twoFactorCode: null,
        twoFactorCodeExpiry: null
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: enabled ? '2fa_enabled' : '2fa_disabled',
        entity: 'user',
        entityId: userId,
        description: enabled ? 'Enabled two-factor authentication' : 'Disabled two-factor authentication',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    return { 
      success: true, 
      message: enabled ? '2FA enabled successfully' : '2FA disabled successfully' 
    }
  } catch (error: any) {
    console.error('Error toggling 2FA:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to toggle 2FA'
    })
  }
})


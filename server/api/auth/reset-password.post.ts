import { defineEventHandler, readBody, createError, getRequestIP, getRequestHeader } from 'h3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { assertRegisterPassword } from '../../utils/authInputValidation'
import { verifyTurnstileToken } from '../../utils/turnstile'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const newPassword = assertRegisterPassword(body?.newPassword)
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!token) {
      throw createError({ statusCode: 400, statusMessage: 'Reset token is required' })
    }
    if (newPassword !== confirmPassword) {
      throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
    }

    await verifyTurnstileToken(event, body?.turnstileToken)

    const tokenHash = sha256(token)

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        passwordResetTokenExpiry: true,
        mustChangePassword: true,
      },
    })

    if (!user || !user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: 'This reset link is invalid or has expired. Please request a new one.',
      })
    }

    // Block silly reuse of the same password.
    if (user.password) {
      const same = await bcrypt.compare(newPassword, user.password)
      if (same) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Please choose a password different from your previous one.',
        })
      }
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        // Consume the token so the link can't be replayed.
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        // Also clear any pending 2FA challenge state and "must change" flag.
        twoFactorCode: null,
        twoFactorCodeExpiry: null,
        mustChangePassword: false,
      },
    })

    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'password_reset_completed',
          description: 'Password changed via reset link',
          ipAddress: getRequestIP(event),
          userAgent: getRequestHeader(event, 'user-agent'),
        },
      })
    } catch {
      // Non-fatal audit logging
    }

    // Issue a fresh session token so we can sign the user straight in after reset.
    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    return {
      success: true,
      message: 'Password updated. You are now signed in.',
      token: newToken,
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number; statusMessage?: string; message?: string }
    if (typeof e?.statusCode === 'number') {
      throw error
    }
    console.error('[auth/reset-password] unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: e?.message || 'Failed to reset password',
    })
  }
})

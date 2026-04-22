import { defineEventHandler, readBody, createError } from 'h3'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Cheap validity probe so the reset page can show a clear "link expired" state
 * before the user fills out the form. Does not consume the token.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Reset token is required' })
  }

  const tokenHash = sha256(token)
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: tokenHash },
    select: {
      email: true,
      firstName: true,
      passwordResetTokenExpiry: true,
    },
  })

  if (!user || !user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: 'This password reset link is invalid or has expired. Please request a new one.',
    })
  }

  // Reveal only what the page needs to greet the user — never the email.
  return {
    valid: true,
    firstName: user.firstName || null,
    expiresAt: user.passwordResetTokenExpiry.toISOString(),
  }
})

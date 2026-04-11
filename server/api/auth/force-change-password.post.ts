import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const { currentPassword, newPassword, token } = await readBody(event)

    if (!currentPassword || !newPassword || !token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'currentPassword, newPassword, and token are required'
      })
    }

    if (newPassword.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'New password must be at least 8 characters'
      })
    }

    if (currentPassword === newPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'New password must be different from the current password'
      })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    } catch {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        mustChangePassword: true,
      }
    })

    if (!user || !user.password) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Current password is incorrect'
      })
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'password_changed',
        description: 'Password changed after first login',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    return {
      success: true,
      message: 'Password changed successfully',
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: false,
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to change password'
    })
  }
})

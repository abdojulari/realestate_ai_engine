import { defineEventHandler, readBody, createError } from 'h3'
import {
  assertRegisterEmail,
  assertRegisterPassword,
  assertPersonName,
  optionalPhone,
  optionalPreferredContactTime,
} from '../../utils/authInputValidation'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = assertRegisterEmail(body?.email)
    const password = assertRegisterPassword(body?.password)
    const firstName = assertPersonName(body?.firstName, 'first name')
    const lastName = assertPersonName(body?.lastName, 'last name')
    const phone = optionalPhone(body?.phone)
    const preferredContactTime = optionalPreferredContactTime(body?.preferredContactTime)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User already exists'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        ...(phone !== undefined && { phone }),
        ...(preferredContactTime !== undefined && { preferredContactTime }),
      }
    })

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    )

    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number }
    if (typeof e?.statusCode === 'number') {
      throw error
    }
    console.error('[auth/register] unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Registration failed',
    })
  }
})

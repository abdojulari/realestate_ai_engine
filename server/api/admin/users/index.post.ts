import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { firstName, lastName, email, role, phone, password, status } = body

  // Validate required fields
  if (!firstName || !lastName || !email || !role || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: firstName, lastName, email, role, password'
    })
  }

  // Validate email format
  const emailRegex = /.+@.+\..+/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    })
  }

  // Validate password length
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters long'
    })
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'User with this email already exists'
    })
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        phone: phone || null,
        password: hashedPassword,
        // Note: status is handled as a computed field in the GET endpoint
        // If you need to store status in DB, add it to the Prisma schema
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Return user data in the same format as the GET endpoint
    return {
      ...newUser,
      status: status || 'active',
      lastLogin: newUser.updatedAt
    }
  } catch (error: any) {
    console.error('Error creating user:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user'
    })
  }
})

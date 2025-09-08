import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number((event.context.params as any).id)
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid user ID'
    })
  }

  const body = await readBody(event)
  const { firstName, lastName, email, role, phone, password, status } = body

  // Validate required fields
  if (!firstName || !lastName || !email || !role) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: firstName, lastName, email, role'
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

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id }
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Check if email is already taken by another user
  const emailTaken = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id }
    }
  })

  if (emailTaken) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email is already taken by another user'
    })
  }

  try {
    const updateData: any = {
      firstName,
      lastName,
      email,
      role,
      phone: phone || null
    }

    // Only update password if provided
    if (password && password.trim()) {
      if (password.length < 8) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Password must be at least 8 characters long'
        })
      }
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
      ...updatedUser,
      status: status || 'active',
      lastLogin: updatedUser.updatedAt
    }
  } catch (error: any) {
    console.error('Error updating user:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user'
    })
  }
})

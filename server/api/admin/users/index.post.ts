import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody(event)
  const { firstName, lastName, email, role, phone, password, status } = body

  // Validate required fields
  if (!firstName || !lastName || !email || !role || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: firstName, lastName, email, role, password'
    })
  }

  // Prevent non-super_admin from creating super_admin users
  if (role === 'super_admin' && user.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only super admins can create super admin users'
    })
  }

  if (user.role === 'user' && (role === 'admin' || role === 'super_admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Delegated users cannot create administrator accounts',
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

    // Tenant scoping: super_admin legacy (no adminId); otherwise attach to tenant principal
    const adminId = user.role === 'super_admin' ? undefined : getAdminIdForCreate(user as any)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        phone: phone || null,
        password: hashedPassword,
        ...(adminId !== undefined && { adminId }),
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

import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const currentUser = await requireAdmin(event)

  const id = Number((event.context.params as any).id)
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid user ID'
    })
  }

  // Check if user exists
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      adminId: true
    }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Prevent non-super_admin from resetting a super_admin's password
  if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to reset a super admin\'s password'
    })
  }

  // Tenant scoping: admin can only reset passwords for users under their own team
  if (currentUser.role !== 'super_admin' && targetUser.adminId !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to reset this user\'s password'
    })
  }

  try {
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase()
    
    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Update user's password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })

    // TODO: In a real application, you would send this password via email
    // For now, we'll just log it (remove this in production!)
    console.log(`[PASSWORD RESET] Temporary password for ${targetUser.email}: ${tempPassword}`)

    // In production, you would use an email service like:
    // await sendPasswordResetEmail(targetUser.email, targetUser.firstName, tempPassword)

    return {
      success: true,
      message: `Temporary password has been generated for ${targetUser.email}. In a real application, this would be sent via email.`,
      // TODO: Remove this in production - passwords should never be returned in API responses
      temporaryPassword: tempPassword
    }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reset password'
    })
  }
})

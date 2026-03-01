import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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

    // Send temporary password via email
    try {
      const { queueEmail } = await import('../../../../utils/emailQueue')
      await queueEmail({
        to: targetUser.email,
        subject: 'Your Password Has Been Reset',
        text: `Hi ${targetUser.firstName || 'there'},\n\nYour password has been reset by an administrator.\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately.\n\nIf you did not request this, please contact support.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Password Reset</h2>
            <p>Hi ${targetUser.firstName || 'there'},</p>
            <p>Your password has been reset by an administrator.</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
              <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Your temporary password</div>
              <div style="font-size: 20px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${tempPassword}</div>
            </div>
            <p style="color: #E65100; font-weight: bold;">Please log in and change your password immediately.</p>
            <p style="color: #666; font-size: 14px;">If you did not request this, please contact support.</p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr)
    }

    return {
      success: true,
      message: `A temporary password has been sent to ${targetUser.email}.`
    }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reset password'
    })
  }
})

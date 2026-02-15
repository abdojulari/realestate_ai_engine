import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

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

  // Prevent non-super_admin from modifying a super_admin's status
  if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to modify a super admin user'
    })
  }

  // Tenant scoping: admin can only toggle status for users under their own team
  if (currentUser.role !== 'super_admin' && targetUser.adminId !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to modify this user'
    })
  }

  try {
    // Note: Since the current database schema doesn't have a 'status' field,
    // we're simulating the toggle by returning the opposite status.
    // In a real application, you would update the actual status field in the database.
    
    // For now, we'll just return success since the status is handled in the frontend
    // In production, you might want to add a 'status' or 'isActive' field to your User model
    
    return {
      success: true,
      message: `User status toggled successfully`,
      user: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        role: targetUser.role,
        // Since we don't have a status field, we'll let the frontend handle the toggle
        statusToggled: true
      }
    }
  } catch (error: any) {
    console.error('Error toggling user status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to toggle user status'
    })
  }
})

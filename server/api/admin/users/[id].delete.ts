import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

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

  // Check if user exists and get their properties
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      properties: { select: { id: true } }
    }
  })

  if (!userToDelete) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Check if user has properties
  if (userToDelete.properties && userToDelete.properties.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Cannot delete user: ${userToDelete.email} has ${userToDelete.properties.length} properties associated with them. Please reassign or remove their properties first.`
    })
  }

  // Prevent admin from deleting themselves
  if (userToDelete.id === currentUser.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot delete your own account'
    })
  }

  // Optional: Prevent deletion of the last admin user
  if (userToDelete.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    })
    
    if (adminCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete the last admin user'
      })
    }
  }

  try {
    // Delete the user
    await prisma.user.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting user:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete user'
    })
  }
})

import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const alertId = Number((event.context.params as any).id)

  if (!alertId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid alert ID'
    })
  }

  try {
    // Verify the alert belongs to the user
    const alert = await prisma.propertyAlert.findFirst({
      where: {
        id: alertId,
        userId: user.id
      }
    })

    if (!alert) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Alert not found'
      })
    }

    // Delete the alert
    await prisma.propertyAlert.delete({
      where: { id: alertId }
    })

    return {
      success: true,
      message: 'Alert deleted successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to delete alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete alert'
    })
  }
})

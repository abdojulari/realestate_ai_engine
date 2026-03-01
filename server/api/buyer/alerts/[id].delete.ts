import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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

import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const alertId = Number((event.context.params as any).id)
  const body = await readBody(event)

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

    // Update the alert
    const updatedAlert = await prisma.propertyAlert.update({
      where: { id: alertId },
      data: body
    })

    return updatedAlert
  } catch (error: any) {
    console.error('❌ Failed to update alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update alert'
    })
  }
})

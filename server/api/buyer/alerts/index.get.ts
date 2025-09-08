import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  try {
    const alerts = await prisma.propertyAlert.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return alerts
  } catch (error: any) {
    console.error('❌ Failed to load user alerts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load alerts'
    })
  }
})

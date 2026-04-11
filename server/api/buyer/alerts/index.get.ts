import { defineEventHandler } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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

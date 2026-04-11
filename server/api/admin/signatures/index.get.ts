import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const signatures = await prisma.signature.findMany({
      where: {
        userId: user.id
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return {
      success: true,
      signatures
    }
  } catch (error: any) {
    console.error('Get signatures error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch signatures'
    })
  }
})


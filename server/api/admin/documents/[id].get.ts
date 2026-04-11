import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const id = parseInt(event.context.params?.id || '0')
    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid document ID' })
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!document) {
      throw createError({ statusCode: 404, message: 'Document not found' })
    }

    return {
      success: true,
      document
    }
  } catch (error: any) {
    console.error('Get document error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch document'
    })
  }
})


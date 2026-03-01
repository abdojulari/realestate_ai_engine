import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const body = await readBody(event)
    const { name, type, signatureData, isDefault } = body

    if (!name || !type || !signatureData) {
      throw createError({ 
        statusCode: 400, 
        message: 'Missing required fields: name, type, signatureData' 
      })
    }

    // If this signature is set as default, unset all other defaults for this user
    if (isDefault) {
      await prisma.signature.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const signature = await prisma.signature.create({
      data: {
        userId: user.id,
        name,
        type,
        signatureData,
        isDefault: isDefault || false
      }
    })

    return {
      success: true,
      signature
    }
  } catch (error: any) {
    console.error('Create signature error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create signature'
    })
  }
})


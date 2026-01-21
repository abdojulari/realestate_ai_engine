import { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const id = parseInt(event.context.params?.id || '0')
    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid signature ID' })
    }

    const signature = await prisma.signature.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!signature) {
      throw createError({ statusCode: 404, message: 'Signature not found' })
    }

    await prisma.signature.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'Signature deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete signature error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete signature'
    })
  }
})


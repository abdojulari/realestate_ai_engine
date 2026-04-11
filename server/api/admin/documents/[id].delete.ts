import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import fs from 'fs'
import path from 'path'
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
      }
    })

    if (!document) {
      throw createError({ statusCode: 404, message: 'Document not found' })
    }

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'public', document.filePath)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete from database
    await prisma.document.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'Document deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete document error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete document'
    })
  }
})


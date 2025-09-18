import { defineEventHandler, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid testimonial ID'
    })
  }

  try {
    // Get testimonial to check for avatar file
    const testimonial = await prisma.testimonial.findUnique({
      where: { id },
      select: { avatar: true }
    })

    if (!testimonial) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Testimonial not found'
      })
    }

    // Delete the testimonial
    await prisma.testimonial.delete({
      where: { id }
    })

    // Delete avatar file if exists
    if (testimonial.avatar) {
      try {
        const filePath = join(process.cwd(), 'public', testimonial.avatar)
        await unlink(filePath)
      } catch (fileError) {
        console.error('Error deleting avatar file:', fileError)
        // Don't fail the request if file deletion fails
      }
    }

    return { success: true, message: 'Testimonial deleted successfully' }
  } catch (error) {
    console.error('Error deleting testimonial:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete testimonial'
    })
  }
})

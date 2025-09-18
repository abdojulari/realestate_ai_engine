import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

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

  const body = await readBody<{
    approved?: boolean
    featured?: boolean
    displayOrder?: number
  }>(event)

  try {
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        ...(body.approved !== undefined && { approved: body.approved }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder })
      }
    })

    return testimonial
  } catch (error) {
    console.error('Error updating testimonial:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update testimonial'
    })
  }
})

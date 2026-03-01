import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid testimonial ID'
    })
  }

  // Verify tenant ownership
  const existing = await prisma.testimonial.findUnique({
    where: { id },
    select: { adminId: true }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Testimonial not found'
    })
  }

  requireTenantAccess(user, existing.adminId)

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

import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdmin, isAdminRole } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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
    /** Super-admin only: attach legacy orphan rows (`adminId` null) to a tenant broker user. */
    adminId?: number | null
  }>(event)

  let assignAdminId: number | undefined
  if (body.adminId !== undefined) {
    if (user.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only platform super-admins can assign testimonial tenant ownership',
      })
    }
    if (body.adminId === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'adminId cannot be cleared; assign a valid tenant broker user id',
      })
    }
    const broker = await prisma.user.findUnique({
      where: { id: body.adminId },
      select: { id: true, role: true },
    })
    if (!broker || !isAdminRole(broker.role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'adminId must be an admin or super_admin user',
      })
    }
    assignAdminId = broker.id
  }

  try {
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        ...(body.approved !== undefined && { approved: body.approved }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(assignAdminId !== undefined && { adminId: assignAdminId }),
      },
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

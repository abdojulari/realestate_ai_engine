import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid estimate ID'
    })
  }

  // Verify tenant ownership
  const existing = await prisma.homeEstimate.findUnique({
    where: { id },
    select: { adminId: true }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Estimate not found'
    })
  }

  requireTenantAccess(user, existing.adminId)

  const body = await readBody<{
    status?: string
    estimatedValue?: number
    agentNotes?: string
  }>(event)

  try {
    const estimate = await prisma.homeEstimate.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.estimatedValue !== undefined && { estimatedValue: body.estimatedValue }),
        ...(body.agentNotes !== undefined && { agentNotes: body.agentNotes })
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

    return estimate
  } catch (error) {
    console.error('Error updating estimate:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update estimate'
    })
  }
})

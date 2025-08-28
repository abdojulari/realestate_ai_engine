import { defineEventHandler, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  // Guard: only numeric IDs are valid; avoid catching routes like "/saved"
  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Property not found'
    })
  }

  const property = await prisma.property.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  if (!property) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Property not found'
    })
  }

  // Transform the response to match expected format
  return {
    ...property,
    images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
    features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
    agent: property.user
  }
})

import { defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Get user from context (set by auth middleware)
  const user = event.context.user
  
  const property = await prisma.property.create({
    data: {
      ...body,
      userId: user.id,
      images: JSON.stringify(body.images || []),
      features: JSON.stringify(body.features || {}),
    },
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

  // Transform the response to match expected format
  return {
    ...property,
    images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
    features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
    agent: property.user
  }
})

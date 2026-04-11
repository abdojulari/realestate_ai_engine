import { defineEventHandler, readBody } from 'h3'
import { getAdminIdForCreate } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Get user from context (set by auth middleware)
  const user = event.context.user
  const adminId = getAdminIdForCreate(user)
  
  const property = await prisma.property.create({
    data: {
      ...body,
      userId: user.id,
      adminId,
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

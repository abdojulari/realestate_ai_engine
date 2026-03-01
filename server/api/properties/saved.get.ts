import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    return []
  }

  const saved = await prisma.savedProperty.findMany({
    where: { userId: user.id },
    include: {
      property: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          }
        }
      }
    }
  })

  return saved.map((sp) => ({
    ...sp.property,
    images: typeof sp.property.images === 'string' ? JSON.parse(sp.property.images as any) : sp.property.images,
    features: typeof sp.property.features === 'string' ? JSON.parse(sp.property.features as any) : sp.property.features,
    agent: sp.property.user,
    isSaved: true
  }))
})


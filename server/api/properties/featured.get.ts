import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async () => {
  const properties = await prisma.property.findMany({
    orderBy: { views: 'desc' },
    take: 10,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  })

  return properties.map((p: any) => ({
    ...p,
    images: typeof p.images === 'string' ? JSON.parse(p.images as any) : p.images,
    features: typeof p.features === 'string' ? JSON.parse(p.features as any) : p.features,
    agent: p.user
  }))
})



import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    return []
  }

  const rows = await prisma.viewingRequest.findMany({
    where: { userId: user.id },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          address: true,
          price: true,
          images: true,
        },
      },
    },
    orderBy: { dateTime: 'desc' },
  })

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    propertyId: r.propertyId,
    dateTime: r.dateTime.toISOString(),
    status: r.status,
    notes: r.notes,
    property: {
      ...r.property,
      images:
        typeof r.property.images === 'string'
          ? (() => {
              try {
                return JSON.parse(r.property.images as string)
              } catch {
                return []
              }
            })()
          : r.property.images,
    },
  }))
})

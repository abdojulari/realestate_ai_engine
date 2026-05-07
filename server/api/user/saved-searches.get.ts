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

  const rows = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    filters: r.filters,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
})

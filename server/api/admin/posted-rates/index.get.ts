import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const where = getTenantFilter(user)

  const rates = await prisma.postedRate.findMany({
    where,
    orderBy: [
      { sortOrder: 'asc' },
      { category: 'asc' },
      { bank: 'asc' },
    ],
  })

  return { rates }
})

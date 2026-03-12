import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await requireFeature(FEATURES.CMA, event)

  const query = getQuery(event)
  const province = query.province as string | undefined
  const city = query.city as string | undefined

  const where: any = { status: 'sold' }

  if (province && province !== 'All') {
    where.province = province
  }
  if (city) {
    where.city = { contains: city, mode: 'insensitive' }
  }

  const raw = await prisma.property.findMany({
    where,
    distinct: ['cityRegion'],
    select: { cityRegion: true },
    orderBy: { cityRegion: 'asc' },
  })

  const communities = raw
    .map(r => r.cityRegion)
    .filter((c): c is string => Boolean(c) && c.trim().length > 0 && !/^\d+$/.test(c))
    .sort((a, b) => a.localeCompare(b))

  return { communities }
})

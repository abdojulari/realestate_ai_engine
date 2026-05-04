import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { buildCityWhereClause } from '../../../utils/city-dictionary'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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
    // Pull communities from every row that resolves to the same canonical
    // city (handles "Calgary" + "Calgary (NW)" + Pillar9 codes 0046/0047
    // returning one combined community list).
    const cityConditions = buildCityWhereClause(city)
    if (cityConditions.length > 0) {
      where.AND = [...(where.AND || []), { OR: cityConditions }]
    }
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

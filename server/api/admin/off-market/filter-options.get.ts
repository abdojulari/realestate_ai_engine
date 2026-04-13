import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


const OFF_MARKET_STATUSES = ['terminated', 'withdrawn', 'expired', 'sold']

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super admin access required' })
  }

  const tenantFilter = getTenantFilter(user)

  const [citiesRaw, sourcesRaw] = await Promise.all([
    prisma.property.findMany({
      where: { ...tenantFilter, status: { in: OFF_MARKET_STATUSES } },
      distinct: ['city'],
      select: { city: true },
    }),
    prisma.property.findMany({
      where: { ...tenantFilter, status: { in: OFF_MARKET_STATUSES } },
      distinct: ['source'],
      select: { source: true },
    }),
  ])

  const cities = [...new Set(
    citiesRaw
      .map(r => r.city)
      .filter((c): c is string => Boolean(c) && !/^\d+$/.test(c))
  )].sort()

  const sources = sourcesRaw.map(r => r.source).filter(Boolean).sort()

  return { cities, sources }
})

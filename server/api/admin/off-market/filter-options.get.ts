import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getPublicSharedMlsWhere } from '../../../utils/tenant'
import { canonicalizeCityList } from '../../../utils/city-dictionary'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


const OFF_MARKET_STATUSES = ['terminated', 'withdrawn', 'expired', 'sold']

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  // Match the catalog scoping used by /api/admin/off-market: shared MLS
  // (CREA + Pillar9) for all tenants, plus this tenant's manual rows.
  const tenantFilter = getTenantFilter(user)
  const sharedWhere = getPublicSharedMlsWhere(tenantFilter)
  const baseWhere = { AND: [sharedWhere, { status: { in: OFF_MARKET_STATUSES } }] }

  const [citiesRaw, sourcesRaw] = await Promise.all([
    prisma.property.findMany({
      where: baseWhere,
      distinct: ['city'],
      select: { city: true },
    }),
    prisma.property.findMany({
      where: baseWhere,
      distinct: ['source'],
      select: { source: true },
    }),
  ])

  // canonicalizeCityList resolves Pillar9 codes to display names, dedupes
  // "Calgary" + "Calgary (NW)" + their codes into one entry, and drops
  // still-unmapped numeric codes (no human label to show).
  const cities = canonicalizeCityList(citiesRaw.map(r => r.city))

  const sources = sourcesRaw.map(r => r.source).filter(Boolean).sort()

  return { cities, sources }
})

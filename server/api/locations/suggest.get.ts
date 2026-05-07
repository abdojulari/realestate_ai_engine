import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { getCanonicalCityName, isCityCode } from '../../utils/city-dictionary'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/** Autocomplete cities from live inventory — tenant-scoped, active listings only. */
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  if (q.length < 2) return []

  const tenantFilter = await getPublicTenantFilter(event)

  const rows = await prisma.property.groupBy({
    by: ['city'],
    where: {
      AND: [
        getPublicSharedMlsWhere(tenantFilter),
        { status: 'for_sale' },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    },
    _count: { id: true },
    orderBy: { city: 'asc' },
    take: 40,
  })

  const seen = new Set<string>()
  const out: { id: string; description: string }[] = []

  for (const row of rows) {
    if (!row.city) continue
    const canonical = getCanonicalCityName(row.city)
    if (!canonical || isCityCode(canonical)) continue
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: `city-${key}`, description: canonical })
    if (out.length >= 15) break
  }

  return out
})

import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import {
  sqlCityMatchesProperty,
  sqlResolvedNeighborhoodLabel,
} from '../../../utils/propertyNeighborhoodArea'
import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await requireFeature(FEATURES.CMA, event)

  const query = getQuery(event)
  const province = (query.province as string | undefined) || ''
  const city = (query.city as string | undefined) || ''

  // Resolve the dropdown label the same way `/api/properties/neighborhoods`
  // does: subdivisionName (CREA/Pillar9 RESO) → features.cityRegion → column
  // cityRegion. Many sold rows (esp. Edmonton) only fill the JSON fields, so
  // reading `cityRegion` alone returned an empty list.
  const resolved = sqlResolvedNeighborhoodLabel('')

  const provinceClause =
    province && province !== 'All'
      ? Prisma.sql`AND province = ${province}`
      : Prisma.sql``

  const cityClause = city
    ? Prisma.sql`AND ${sqlCityMatchesProperty('', city)}`
    : Prisma.sql``

  const rows = await prisma.$queryRaw<Array<{ neighborhood: string }>>`
    SELECT DISTINCT ${resolved} AS neighborhood
    FROM "public"."Property"
    WHERE status = 'sold'
      ${provinceClause}
      ${cityClause}
      AND ${resolved} IS NOT NULL
      AND LENGTH(TRIM(${resolved})) > 0
  `

  const communities = rows
    .map(r => r.neighborhood)
    .filter((c): c is string => Boolean(c) && c.trim().length > 0 && !/^\d+$/.test(c))
    .sort((a, b) => a.localeCompare(b))

  return { communities }
})

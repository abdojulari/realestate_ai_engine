import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { lookupCity } from '../../utils/city-dictionary'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/properties/neighborhoods?city=Edmonton
 * Extracts unique SubdivisionName values from property features JSON,
 * filtered by city, with property counts. This gives real-time accurate
 * neighborhoods based on actual property data.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const city = (query.city as string || '').trim()
  const search = (query.search as string || '').trim()

  if (!city) {
    return { neighborhoods: [] }
  }

  const tenantFilter = await getPublicTenantFilter(event)
  const sharedMlsWhere = getPublicSharedMlsWhere(tenantFilter)

  // Build the city-match clause through the bidirectional dictionary so
  // the raw SQL covers every spelling variant + any Pillar9 codes that
  // map to the same canonical city. Falls back to the legacy ILIKE when
  // the input isn't in the dictionary so admins can still query
  // unmapped cities.
  const entry = lookupCity(city)
  const cityClause = entry
    ? Prisma.sql`(
        ${Prisma.join(
          [
            ...[entry.name, ...(entry.aliases ?? [])].map(
              n => Prisma.sql`city ILIKE ${n}`,
            ),
            ...(entry.codes.length > 0
              ? [Prisma.sql`city = ANY(${entry.codes})`]
              : []),
          ],
          ' OR ',
        )}
      )`
    : Prisma.sql`city ILIKE ${city}`

  // Use raw SQL to extract subdivisionName from the JSONB features column
  // This is much more efficient than loading all properties into memory
  const searchCondition = search
    ? Prisma.sql`AND subdivision_name ILIKE ${'%' + search + '%'}`
    : Prisma.sql``

  const results = await prisma.$queryRaw<Array<{
    subdivision_name: string
    property_count: bigint
    avg_price: number | null
    avg_lat: number | null
    avg_lng: number | null
  }>>`
    SELECT 
      features->>'subdivisionName' AS subdivision_name,
      COUNT(*)::bigint AS property_count,
      AVG(price) AS avg_price,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM "public"."Property"
    WHERE ${cityClause}
      AND status = 'for_sale'
      AND features IS NOT NULL
      AND features->>'subdivisionName' IS NOT NULL
      AND features->>'subdivisionName' != ''
      ${searchCondition}
    GROUP BY features->>'subdivisionName'
    HAVING COUNT(*) >= 1
    ORDER BY COUNT(*) DESC
    LIMIT 200
  `

  const neighborhoods = results.map((r, index) => ({
    id: index + 1,
    name: r.subdivision_name,
    city,
    propertyCount: Number(r.property_count),
    averagePrice: r.avg_price ? Math.round(r.avg_price) : null,
    centerLatitude: r.avg_lat,
    centerLongitude: r.avg_lng
  }))

  return {
    neighborhoods,
    total: neighborhoods.length
  }
})

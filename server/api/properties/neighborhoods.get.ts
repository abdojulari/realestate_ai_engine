import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../../utils/tenant'
import { lookupCity } from '../../utils/city-dictionary'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/properties/neighborhoods?city=Edmonton
 *
 * CREA / RESO exposes **both** fields; they are not duplicates:
 *
 * • **SubdivisionName** — finer-grained: named subdivision, condo complex,
 *   builder tract, or small neighbourhood label when the board fills it in.
 * • **CityRegion** — broader intra-city area (board-dependent naming; think
 *   “district / quadrant / MLS community area” rather than a legal subdivision).
 *
 * Many Alberta listings have **CityRegion** populated but **SubdivisionName**
 * empty (common on condos / infill). Fewer have the reverse. We therefore
 * resolve one **dropdown label** per row as:
 *   subdivisionName → features.cityRegion → Property.cityRegion
 * so nothing falls through the cracks when only one of the two RESO fields is set.
 *
 * Pillar9/Matrix maps the same RESO concepts where the API returns them:
 * `SubdivisionName` + `CityRegion` → same JSON/column shape as CREA.
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

  // Single resolved "area" label per row — matches how CREA/Pillar9 expose community.
  const neighborhoodExpr = Prisma.sql`
    COALESCE(
      NULLIF(TRIM(features->>'subdivisionName'), ''),
      NULLIF(TRIM(features->>'cityRegion'), ''),
      NULLIF(TRIM("cityRegion"), '')
    )
  `

  const searchCondition = search
    ? Prisma.sql`AND COALESCE(
      NULLIF(TRIM(features->>'subdivisionName'), ''),
      NULLIF(TRIM(features->>'cityRegion'), ''),
      NULLIF(TRIM("cityRegion"), '')
    ) ILIKE ${'%' + search + '%'}`
    : Prisma.sql``

  const results = await prisma.$queryRaw<Array<{
    neighborhood_name: string
    property_count: bigint
    avg_price: number | null
    avg_lat: number | null
    avg_lng: number | null
  }>>`
    SELECT 
      ${neighborhoodExpr} AS neighborhood_name,
      COUNT(*)::bigint AS property_count,
      AVG(price) AS avg_price,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM "public"."Property"
    WHERE ${cityClause}
      AND status = 'for_sale'
      AND COALESCE(
        NULLIF(TRIM(features->>'subdivisionName'), ''),
        NULLIF(TRIM(features->>'cityRegion'), ''),
        NULLIF(TRIM("cityRegion"), '')
      ) IS NOT NULL
      AND LENGTH(TRIM(COALESCE(
        NULLIF(TRIM(features->>'subdivisionName'), ''),
        NULLIF(TRIM(features->>'cityRegion'), ''),
        NULLIF(TRIM("cityRegion"), '')
      ))) > 0
      ${searchCondition}
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 200
  `

  const neighborhoods = results.map((r, index) => ({
    id: index + 1,
    name: r.neighborhood_name,
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

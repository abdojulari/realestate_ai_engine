import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import {
  NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL,
  sqlResolvedNeighborhoodLabel,
  sqlNeighborhoodAreaIsBlank,
  sqlCityMatchesProperty,
  sqlPublicSharedMlsSources,
} from '../../utils/propertyNeighborhoodArea'
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
 * Rows with none of those set still appear once under {@link NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL}.
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

  const cityClause = sqlCityMatchesProperty('', city)
  const resolved = sqlResolvedNeighborhoodLabel('')
  const tenantClause = sqlPublicSharedMlsSources('', tenantFilter.adminId)

  const searchCondition = search
    ? Prisma.sql`AND ${resolved} ILIKE ${'%' + search + '%'}`
    : Prisma.sql``

  const results = await prisma.$queryRaw<Array<{
    neighborhood_name: string
    property_count: bigint
    avg_price: number | null
    avg_lat: number | null
    avg_lng: number | null
  }>>`
    SELECT 
      ${resolved} AS neighborhood_name,
      COUNT(*)::bigint AS property_count,
      AVG(price) AS avg_price,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM "public"."Property"
    WHERE ${cityClause}
      AND ${tenantClause}
      AND status = 'for_sale'
      AND (${resolved} IS NOT NULL AND LENGTH(TRIM(${resolved})) > 0)
      ${searchCondition}
    GROUP BY 1
    ORDER BY COUNT(*) DESC
  `

  const includeUnspecified =
    !search ||
    NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL.toLowerCase().includes(search.toLowerCase())

  let unspecifiedCount = 0
  let unspecifiedAvgPrice: number | null = null
  let unspecifiedAvgLat: number | null = null
  let unspecifiedAvgLng: number | null = null

  if (includeUnspecified) {
    const [agg] = await prisma.$queryRaw<Array<{
      property_count: bigint
      avg_price: number | null
      avg_lat: number | null
      avg_lng: number | null
    }>>`
      SELECT 
        COUNT(*)::bigint AS property_count,
        AVG(price) AS avg_price,
        AVG(latitude) AS avg_lat,
        AVG(longitude) AS avg_lng
      FROM "public"."Property"
      WHERE ${cityClause}
        AND ${tenantClause}
        AND status = 'for_sale'
        AND ${sqlNeighborhoodAreaIsBlank('')}
    `
    if (agg && Number(agg.property_count) > 0) {
      unspecifiedCount = Number(agg.property_count)
      unspecifiedAvgPrice = agg.avg_price ? Math.round(agg.avg_price) : null
      unspecifiedAvgLat = agg.avg_lat
      unspecifiedAvgLng = agg.avg_lng
    }
  }

  const neighborhoods = results.map((r, index) => ({
    id: index + 1,
    name: r.neighborhood_name,
    city,
    propertyCount: Number(r.property_count),
    averagePrice: r.avg_price ? Math.round(r.avg_price) : null,
    centerLatitude: r.avg_lat,
    centerLongitude: r.avg_lng,
  }))

  if (unspecifiedCount > 0) {
    neighborhoods.push({
      id: neighborhoods.length + 1,
      name: NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL,
      city,
      propertyCount: unspecifiedCount,
      averagePrice: unspecifiedAvgPrice,
      centerLatitude: unspecifiedAvgLat,
      centerLongitude: unspecifiedAvgLng,
    })
  }

  return {
    neighborhoods,
    total: neighborhoods.length,
  }
})

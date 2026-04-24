import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { pillar9Service } from '../../../utils/pillar9.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)

    // Enforce Gold / Platinum tier
    await requireFeatureForUser(FEATURES.BEST_DEALS, user, event)

    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    // City is REQUIRED
    const city = query.city as string
    if (!city) {
      throw createError({ statusCode: 400, message: 'City is required' })
    }

    const community = query.community as string
    const propertyType = query.propertyType as string
    const minDrop = parseFloat(query.minDrop as string) || 0
    const maxPrice = parseFloat(query.maxPrice as string) || undefined
    const minPrice = parseFloat(query.minPrice as string) || undefined
    const sortBy = (query.sortBy as string) || 'biggest_drop'
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    // ───── Build the query ─────
    // City is always applied (AND).
    // Community and propertyType are OR – if either matches, the property qualifies.
    // Match both the human-readable name and any Pillar9 city codes that map to it
    const matchingCodes = pillar9Service.getCodesForCityName(city)
    const cityConditions: any[] = [{ city: { contains: city, mode: 'insensitive' } }]
    if (matchingCodes.length > 0) {
      cityConditions.push({ city: { in: matchingCodes } })
    }

    // A row qualifies as a deal candidate if we have ANY usable baseline
    // (preferred: MLS OriginalListPrice straight from CREA/Pillar9; fallback:
    // our internal firstEntryPrice captured on the first sync). The actual
    // `price < baseline` check is applied below in code so we can pick whichever
    // baseline is present per row.
    const andConditions: any[] = [
      { ...tenantFilter },
      { status: { in: ['for_sale', 'pending'] } },
      {
        OR: [
          { originalListPrice: { not: null } },
          { firstEntryPrice: { not: null } },
        ],
      },
      { OR: cityConditions },
    ]

    if (maxPrice) andConditions.push({ price: { lte: maxPrice } })
    if (minPrice) andConditions.push({ price: { gte: minPrice } })

    // Community and propertyType use OR logic when both provided
    if (community && propertyType) {
      andConditions.push({
        OR: [
          { cityRegion: { contains: community, mode: 'insensitive' } },
          { type: { contains: propertyType, mode: 'insensitive' } },
        ],
      })
    } else if (community) {
      andConditions.push({ cityRegion: { contains: community, mode: 'insensitive' } })
    } else if (propertyType) {
      andConditions.push({ type: { contains: propertyType, mode: 'insensitive' } })
    }

    const where = { AND: andConditions }

    // Fetch candidates (cap at 2000 to avoid memory issues)
    const allCandidates: any[] = await (prisma.property as any).findMany({
      where,
      include: {
        priceHistory: {
          where: { event: 'price_decrease' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    })

    // Pick the strongest baseline available for each row, in this order:
    //   1. MLS OriginalListPrice (truth from the feed — captures pre-ingest cuts)
    //   2. firstEntryPrice (our snapshot from the very first sync — only sees
    //      drops that happen after we started tracking)
    // Then keep rows whose current price is strictly below that baseline.
    let priceCutProperties = allCandidates
      .map((p: any) => {
        const baseline =
          typeof p.originalListPrice === 'number' && p.originalListPrice > 0
            ? p.originalListPrice
            : (typeof p.firstEntryPrice === 'number' && p.firstEntryPrice > 0
              ? p.firstEntryPrice
              : null)

        if (baseline === null || !(p.price < baseline)) return null

        const changeAmt = p.price - baseline
        const changePct = parseFloat(((changeAmt / baseline) * 100).toFixed(2))

        return {
          ...p,
          priceDrop: {
            originalPrice: baseline,
            currentPrice: p.price,
            changeAmt,
            changePct,
            dollarSaved: Math.abs(changeAmt),
            // Surface which signal we trusted so the UI can show "MLS verified"
            // vs "tracked since first sync" if it ever wants to.
            source: typeof p.originalListPrice === 'number' && p.originalListPrice > 0
              ? 'mls'
              : 'tracked',
          },
        }
      })
      .filter((p: any): p is any => p !== null)

    // Minimum drop filter
    if (minDrop > 0) {
      priceCutProperties = priceCutProperties.filter(
        (p: any) => Math.abs(p.priceDrop.changePct) >= minDrop,
      )
    }

    // Sort
    if (sortBy === 'biggest_drop') {
      priceCutProperties.sort((a: any, b: any) => a.priceDrop.changePct - b.priceDrop.changePct)
    } else if (sortBy === 'most_recent') {
      priceCutProperties.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } else if (sortBy === 'biggest_savings') {
      priceCutProperties.sort(
        (a: any, b: any) => b.priceDrop.dollarSaved - a.priceDrop.dollarSaved,
      )
    }

    // Pagination
    const total = priceCutProperties.length
    const paged = priceCutProperties.slice((page - 1) * limit, page * limit)

    // Chart data – top 10 properties by dollar drop for the mini bar chart
    const chartData = priceCutProperties.slice(0, 10).map((p: any) => ({
      label: p.address?.split(',')[0] || `#${p.id}`,
      originalPrice: p.priceDrop.originalPrice,
      currentPrice: p.priceDrop.currentPrice,
      savings: p.priceDrop.dollarSaved,
      dropPct: Math.abs(p.priceDrop.changePct),
    }))

    // Summary
    const avgDropPct =
      total > 0
        ? parseFloat(
            (
              priceCutProperties.reduce(
                (sum: number, p: any) => sum + Math.abs(p.priceDrop.changePct),
                0,
              ) / total
            ).toFixed(1),
          )
        : 0

    const biggestDropPct =
      total > 0
        ? parseFloat(
            Math.max(...priceCutProperties.map((p: any) => Math.abs(p.priceDrop.changePct))).toFixed(1),
          )
        : 0

    return {
      properties: paged,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: { totalDeals: total, avgDropPercent: avgDropPct, biggestDrop: biggestDropPct },
      chartData,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

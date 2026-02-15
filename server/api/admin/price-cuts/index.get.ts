import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'

const prisma = new PrismaClient()

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
    const baseWhere: any = {
      ...tenantFilter,
      status: { in: ['for_sale', 'pending'] },
      firstEntryPrice: { not: null },
      city: { contains: city, mode: 'insensitive' },
    }

    if (maxPrice) baseWhere.price = { ...baseWhere.price, lte: maxPrice }
    if (minPrice) baseWhere.price = { ...baseWhere.price, gte: minPrice }

    // If both community and propertyType are provided → OR between them
    // If only one is provided → treat as simple AND
    // If neither is provided → no additional filter
    let where: any
    if (community && propertyType) {
      where = {
        AND: [baseWhere],
        OR: [
          { cityRegion: { contains: community, mode: 'insensitive' } },
          { type: { contains: propertyType, mode: 'insensitive' } },
        ],
      }
    } else if (community) {
      where = { ...baseWhere, cityRegion: { contains: community, mode: 'insensitive' } }
    } else if (propertyType) {
      where = { ...baseWhere, type: { contains: propertyType, mode: 'insensitive' } }
    } else {
      where = baseWhere
    }

    // Fetch candidates
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
    })

    // Filter to only properties where current price < firstEntryPrice
    let priceCutProperties = allCandidates
      .filter((p: any) => p.firstEntryPrice !== null && p.price < p.firstEntryPrice)
      .map((p: any) => {
        const firstPrice = p.firstEntryPrice as number
        const changeAmt = p.price - firstPrice
        const changePct = parseFloat(((changeAmt / firstPrice) * 100).toFixed(2))

        return {
          ...p,
          priceDrop: {
            originalPrice: firstPrice,
            currentPrice: p.price,
            changeAmt,
            changePct,
            dollarSaved: Math.abs(changeAmt),
          },
        }
      })

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
            Math.min(...priceCutProperties.map((p: any) => p.priceDrop.changePct)).toFixed(1),
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

/**
 * Market Insights API Endpoint (Public, Feature-Gated)
 *
 * Returns market trend indicators, buy/sell recommendations,
 * and key metrics for the AI Search page sidebar.
 *
 * GET /api/market-insights?city=Edmonton
 */

import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../utils/tenant'
import { buildCityWhereClause, getCanonicalCityName } from '../utils/city-dictionary'
import { requireFeature, FEATURES } from '../utils/license'
import { calculateAnalytics } from '../ml/analytics'
import type { RawPropertyData } from '../ml/dataPrep'
import { resolvePropertySoldTimestamp } from '../ml/dataPrep'
import type { MarketOverview, TrendAnalysis } from '../ml/analytics'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


// Cache per city, 30-minute TTL
const insightsCache = new Map<string, { timestamp: number; data: any }>()
const CACHE_TTL = 30 * 60 * 1000

type Direction = 'up' | 'down' | 'stable'

interface MarketIndicator {
  label: string
  direction: Direction
  value: string
  description: string
}

interface BuySellRecommendation {
  forBuyers: { verdict: string; detail: string; isFavorable: boolean }
  forSellers: { verdict: string; detail: string; isFavorable: boolean }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value}`
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}%`
}

function percentDirection(value: number): Direction {
  if (value > 2) return 'up'
  if (value < -2) return 'down'
  return 'stable'
}

function buildIndicators(overview: MarketOverview, trends: TrendAnalysis): MarketIndicator[] {
  return [
    {
      label: 'Price Trend',
      direction: trends.pricesTrending,
      value: formatPercent(overview.yoyPriceGrowth),
      description: 'Year-over-year price change',
    },
    {
      label: 'Sales Volume',
      direction: percentDirection(overview.momSalesGrowth),
      value: formatPercent(overview.momSalesGrowth),
      description: 'Month-over-month sales change',
    },
    {
      label: 'Avg Days on Market',
      direction: overview.avgDaysOnMarket > 60 ? 'up' : overview.avgDaysOnMarket < 30 ? 'down' : 'stable',
      value: `${overview.avgDaysOnMarket} days`,
      description: 'Average time to sell a property',
    },
    {
      label: 'Inventory',
      direction: trends.inventoryTrending,
      value: formatPercent(overview.inventoryChange),
      description: 'Active listing inventory change',
    },
    {
      label: 'Months of Supply',
      direction: overview.monthsOfSupply > 6 ? 'up' : overview.monthsOfSupply < 4 ? 'down' : 'stable',
      value: `${overview.monthsOfSupply} mo`,
      description: 'How long current inventory would last at current sales pace',
    },
    {
      label: 'Absorption Rate',
      direction: overview.absorptionRate > 0.2 ? 'up' : overview.absorptionRate < 0.1 ? 'down' : 'stable',
      value: `${Math.round(overview.absorptionRate * 100)}%`,
      description: 'Percentage of inventory sold per month',
    },
  ]
}

function buildRecommendation(overview: MarketOverview, trends: TrendAnalysis): BuySellRecommendation {
  const { marketType } = trends
  const { monthsOfSupply, momSalesGrowth, yoyPriceGrowth, avgDaysOnMarket, absorptionRate } = overview

  if (marketType === 'buyer') {
    return {
      forBuyers: {
        verdict: 'Great time to buy',
        detail: `Inventory is high with ${monthsOfSupply} months of supply. ` +
          `Properties are averaging ${avgDaysOnMarket} days on market, giving you more negotiating power. ` +
          (yoyPriceGrowth < 0
            ? `Prices are down ${Math.abs(yoyPriceGrowth)}% year-over-year — room to negotiate.`
            : `Price growth has slowed, offering better value.`),
        isFavorable: true,
      },
      forSellers: {
        verdict: 'Challenging conditions for sellers',
        detail: `With ${monthsOfSupply} months of supply and an absorption rate of ${Math.round(absorptionRate * 100)}%, ` +
          `competition among sellers is high. Price aggressively and invest in staging to stand out. ` +
          (momSalesGrowth < -5
            ? `Sales volume declined ${Math.abs(momSalesGrowth)}% — consider waiting for the market to recover.`
            : `Sales volume is steady, so a well-priced home can still sell.`),
        isFavorable: false,
      },
    }
  }

  if (marketType === 'seller') {
    return {
      forBuyers: {
        verdict: 'Competitive market — act fast',
        detail: `Only ${monthsOfSupply} months of supply means limited choices. ` +
          `Properties sell in an average of ${avgDaysOnMarket} days. ` +
          (yoyPriceGrowth > 5
            ? `Prices are up ${yoyPriceGrowth}% YoY — waiting could cost more.`
            : `Prices are rising but still manageable.`) +
          ` Get pre-approved and be prepared to offer strong.`,
        isFavorable: false,
      },
      forSellers: {
        verdict: 'Excellent time to sell',
        detail: `Strong demand with a ${Math.round(absorptionRate * 100)}% absorption rate and only ${monthsOfSupply} months of supply. ` +
          (yoyPriceGrowth > 0
            ? `Prices are up ${yoyPriceGrowth}% year-over-year. `
            : '') +
          (momSalesGrowth > 5
            ? `Sales momentum is strong at +${momSalesGrowth}% month-over-month.`
            : `Buyer activity is solid.`) +
          ` List now to maximise your return.`,
        isFavorable: true,
      },
    }
  }

  // Balanced
  return {
    forBuyers: {
      verdict: 'Fair conditions for buying',
      detail: `The market is balanced with ${monthsOfSupply} months of supply. ` +
        `You have reasonable negotiating power without extreme competition. ` +
        `Take your time to find the right property — but don't hesitate on a great match.`,
      isFavorable: true,
    },
    forSellers: {
      verdict: 'Reasonable time to sell',
      detail: `Balanced market conditions mean fair pricing is key. ` +
        `Properties average ${avgDaysOnMarket} days on market. ` +
        `Price your home realistically and it should attract offers. ` +
        (yoyPriceGrowth > 0
          ? `Prices are still appreciating at ${yoyPriceGrowth}% YoY.`
          : `Price growth has levelled off — avoid overpricing.`),
      isFavorable: true,
    },
  }
}

export default defineEventHandler(async (event) => {
  await requireFeature(FEATURES.AI_INSIGHTS, event)

  const query = getQuery(event)
  // Canonicalise so cache + DB filter share the same key regardless of
  // whether the caller typed a code, alias, or canonical name.
  const cityRaw = (query.city as string) || ''
  const city = cityRaw ? getCanonicalCityName(cityRaw) : ''
  const tenantFilter = await getPublicTenantFilter(event)
  const cacheKey = `${city.toLowerCase() || '__all__'}|${tenantFilter.adminId ?? 'pub'}`

  const cached = insightsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const where: any = {
      AND: [getPublicSharedMlsWhere(tenantFilter)],
    }
    if (city) {
      // Code/name/alias-aware matcher so insights cover the full city
      // even when some rows still hold raw Pillar9 codes ('0100').
      const cityConditions = buildCityWhereClause(city)
      if (cityConditions.length > 0) {
        where.AND.push({ OR: cityConditions })
      }
    }

    const properties = await prisma.property.findMany({
      where,
      select: {
        id: true,
        price: true,
        status: true,
        type: true,
        beds: true,
        baths: true,
        sqft: true,
        city: true,
        province: true,
        createdAt: true,
        updatedAt: true,
        originalEntryTimestamp: true,
        daysOnMarket: true,
        // Needed so resolvePropertySoldTimestamp can read Pillar9 CloseDate
        // (and CREA rows that inherited it via dedupe). Without this,
        // sold-last-30 and all derived KPIs effectively key off `updatedAt`
        // only — wrong whenever sync cadence != calendar sales cadence.
        features: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (properties.length === 0) {
      return { success: false, hasData: false, error: 'No property data available' }
    }

    const now = new Date()
    const rawData: RawPropertyData[] = properties.map((p) => {
      const listingDate = p.originalEntryTimestamp || p.createdAt
      const dom = p.daysOnMarket ?? Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24))
      const soldTimestamp = resolvePropertySoldTimestamp({
        status: p.status,
        features: p.features,
        updatedAt: p.updatedAt,
      })
      return {
        id: p.id,
        price: p.price || 0,
        status: p.status || 'unknown',
        type: p.type || undefined,
        beds: p.beds || undefined,
        baths: p.baths || undefined,
        sqft: p.sqft || undefined,
        city: p.city || undefined,
        province: p.province || undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        soldDate: soldTimestamp,
        daysOnMarket: dom > 0 ? dom : undefined,
      }
    })

    const analytics = calculateAnalytics(rawData)
    const indicators = buildIndicators(analytics.overview, analytics.trends)
    const recommendation = buildRecommendation(analytics.overview, analytics.trends)

    const result = {
      success: true,
      hasData: true,
      generatedAt: new Date().toISOString(),
      city: city || 'All Cities',
      marketType: analytics.trends.marketType,
      indicators,
      recommendation,
      overview: {
        activeListings: analytics.overview.activeListings,
        soldLast30Days: analytics.overview.soldLast30Days,
        avgPrice: analytics.overview.avgPrice,
        medianPrice: analytics.overview.medianPrice,
      },
      insights: analytics.insights,
      monthlyTrends: analytics.monthlyTrends.slice(-6),
    }

    insightsCache.set(cacheKey, { timestamp: Date.now(), data: result })
    return result
  } catch (error: any) {
    console.error('[Market Insights API] Error:', error)
    return { success: false, hasData: false, error: error.message }
  }
})

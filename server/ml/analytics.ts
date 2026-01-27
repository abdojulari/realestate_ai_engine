/**
 * Non-ML Analytics & Business Insights
 * 
 * Computes KPIs, trends, and market insights from raw property data.
 * These metrics are valuable on their own and also feed into ML features.
 */

import * as ss from 'simple-statistics'
import type { MonthlyMetrics, RawPropertyData } from './dataPrep'
import { aggregateMonthlyMetrics } from './dataPrep'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MarketOverview {
  // Current metrics
  activeListings: number
  soldLast30Days: number
  avgPrice: number
  medianPrice: number
  avgDaysOnMarket: number
  absorptionRate: number
  monthsOfSupply: number
  
  // Growth rates
  momSalesGrowth: number
  yoyPriceGrowth: number
  inventoryChange: number
}

export interface TrendAnalysis {
  pricesTrending: 'up' | 'down' | 'stable'
  salesTrending: 'up' | 'down' | 'stable'
  inventoryTrending: 'up' | 'down' | 'stable'
  marketType: 'buyer' | 'seller' | 'balanced'
  seasonalityFactor: number // Current month vs annual average
}

export interface PropertyTypeBreakdown {
  type: string
  count: number
  avgPrice: number
  medianPrice: number
  avgDaysOnMarket: number
  percentOfTotal: number
}

export interface GeoBreakdown {
  city: string
  count: number
  avgPrice: number
  soldCount: number
  avgDaysOnMarket: number
}

export interface FullAnalytics {
  overview: MarketOverview
  trends: TrendAnalysis
  byPropertyType: PropertyTypeBreakdown[]
  byCity: GeoBreakdown[]
  monthlyTrends: MonthlyMetrics[]
  priceDistribution: {
    ranges: string[]
    counts: number[]
  }
  insights: string[]
}

// ============================================
// ANALYTICS CALCULATIONS
// ============================================

/**
 * Calculate full market analytics
 */
export function calculateAnalytics(properties: RawPropertyData[]): FullAnalytics {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  
  // Filter by status
  const active = properties.filter(p => 
    p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'for_sale'
  )
  const sold = properties.filter(p => p.status?.toLowerCase() === 'sold')
  
  // Recent activity
  const soldLast30 = sold.filter(p => {
    const soldDate = p.soldDate || p.updatedAt
    return soldDate && new Date(soldDate) >= thirtyDaysAgo
  })
  const soldPrev30 = sold.filter(p => {
    const soldDate = p.soldDate || p.updatedAt
    return soldDate && new Date(soldDate) >= sixtyDaysAgo && new Date(soldDate) < thirtyDaysAgo
  })
  const soldLastYear = sold.filter(p => {
    const soldDate = p.soldDate || p.updatedAt
    return soldDate && new Date(soldDate) >= oneYearAgo
  })
  
  // Calculate overview
  const overview = calculateOverview(active, soldLast30, soldPrev30, soldLastYear)
  
  // Calculate trends
  const monthlyMetrics = aggregateMonthlyMetrics(properties)
  const trends = analyzeTrends(monthlyMetrics)
  
  // Breakdowns
  const byPropertyType = calculatePropertyTypeBreakdown(properties)
  const byCity = calculateGeoBreakdown(properties)
  
  // Price distribution
  const priceDistribution = calculatePriceDistribution(active)
  
  // Generate insights
  const insights = generateInsights(overview, trends, byPropertyType)
  
  return {
    overview,
    trends,
    byPropertyType,
    byCity,
    monthlyTrends: monthlyMetrics.slice(-12), // Last 12 months
    priceDistribution,
    insights
  }
}

/**
 * Calculate market overview metrics
 */
function calculateOverview(
  active: RawPropertyData[],
  soldLast30: RawPropertyData[],
  soldPrev30: RawPropertyData[],
  soldLastYear: RawPropertyData[]
): MarketOverview {
  const activePrices = active.map(p => p.price).filter(p => p > 0)
  const soldPrices = soldLast30.map(p => p.price).filter(p => p > 0)
  const soldPricesLastYear = soldLastYear.map(p => p.price).filter(p => p > 0)
  const daysOnMarket = soldLast30
    .map(p => p.daysOnMarket)
    .filter((d): d is number => d !== undefined && d !== null)
  
  // Absorption rate = sales / inventory
  const absorptionRate = active.length > 0 
    ? soldLast30.length / active.length 
    : 0
  
  // Months of supply = inverse of absorption rate
  const monthsOfSupply = absorptionRate > 0 ? 1 / absorptionRate : 12
  
  // MoM sales growth
  const momSalesGrowth = soldPrev30.length > 0
    ? (soldLast30.length - soldPrev30.length) / soldPrev30.length
    : 0
  
  // YoY price growth (average monthly price last year vs now)
  const avgPriceLastYear = soldPricesLastYear.length > 0 
    ? ss.mean(soldPricesLastYear) 
    : 0
  const avgPriceNow = soldPrices.length > 0 ? ss.mean(soldPrices) : 0
  const yoyPriceGrowth = avgPriceLastYear > 0
    ? (avgPriceNow - avgPriceLastYear) / avgPriceLastYear
    : 0
  
  return {
    activeListings: active.length,
    soldLast30Days: soldLast30.length,
    avgPrice: activePrices.length > 0 ? Math.round(ss.mean(activePrices)) : 0,
    medianPrice: activePrices.length > 0 ? Math.round(ss.median(activePrices)) : 0,
    avgDaysOnMarket: daysOnMarket.length > 0 ? Math.round(ss.mean(daysOnMarket)) : 0,
    absorptionRate: Math.round(absorptionRate * 100) / 100,
    monthsOfSupply: Math.round(monthsOfSupply * 10) / 10,
    momSalesGrowth: Math.round(momSalesGrowth * 100),
    yoyPriceGrowth: Math.round(yoyPriceGrowth * 100),
    inventoryChange: 0 // TODO: Calculate from historical data
  }
}

/**
 * Analyze market trends
 */
function analyzeTrends(metrics: MonthlyMetrics[]): TrendAnalysis {
  if (metrics.length < 3) {
    return {
      pricesTrending: 'stable',
      salesTrending: 'stable',
      inventoryTrending: 'stable',
      marketType: 'balanced',
      seasonalityFactor: 1
    }
  }
  
  const recent = metrics.slice(-6) // Last 6 months
  
  // Calculate linear trends
  const priceTrend = calculateTrend(recent.map(m => m.avgSoldPrice))
  const salesTrend = calculateTrend(recent.map(m => m.soldCount))
  const inventoryTrend = calculateTrend(recent.map(m => m.activeInventory))
  
  // Determine market type based on months of supply
  const lastMonth = metrics[metrics.length - 1]
  const absorptionRate = lastMonth.absorptionRate
  let marketType: 'buyer' | 'seller' | 'balanced'
  
  if (absorptionRate > 0.2) {
    marketType = 'seller' // High absorption = seller's market
  } else if (absorptionRate < 0.1) {
    marketType = 'buyer' // Low absorption = buyer's market
  } else {
    marketType = 'balanced'
  }
  
  // Seasonality factor: current month vs annual average
  const annualAvgSales = ss.mean(metrics.map(m => m.soldCount))
  const seasonalityFactor = annualAvgSales > 0 
    ? lastMonth.soldCount / annualAvgSales 
    : 1
  
  return {
    pricesTrending: getTrendDirection(priceTrend),
    salesTrending: getTrendDirection(salesTrend),
    inventoryTrending: getTrendDirection(inventoryTrend),
    marketType,
    seasonalityFactor: Math.round(seasonalityFactor * 100) / 100
  }
}

/**
 * Calculate linear trend (slope)
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = ss.mean(values)
  
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  
  return denominator !== 0 ? numerator / denominator : 0
}

/**
 * Convert slope to trend direction
 */
function getTrendDirection(slope: number): 'up' | 'down' | 'stable' {
  const threshold = 0.01 // 1% change per period
  if (slope > threshold) return 'up'
  if (slope < -threshold) return 'down'
  return 'stable'
}

/**
 * Calculate property type breakdown
 */
function calculatePropertyTypeBreakdown(properties: RawPropertyData[]): PropertyTypeBreakdown[] {
  const types = new Map<string, RawPropertyData[]>()
  
  properties.forEach(p => {
    const type = p.type || 'Unknown'
    if (!types.has(type)) {
      types.set(type, [])
    }
    types.get(type)!.push(p)
  })
  
  const total = properties.length
  const breakdown: PropertyTypeBreakdown[] = []
  
  types.forEach((props, type) => {
    const prices = props.map(p => p.price).filter(p => p > 0)
    const daysOnMarket = props
      .map(p => p.daysOnMarket)
      .filter((d): d is number => d !== undefined && d !== null)
    
    breakdown.push({
      type,
      count: props.length,
      avgPrice: prices.length > 0 ? Math.round(ss.mean(prices)) : 0,
      medianPrice: prices.length > 0 ? Math.round(ss.median(prices)) : 0,
      avgDaysOnMarket: daysOnMarket.length > 0 ? Math.round(ss.mean(daysOnMarket)) : 0,
      percentOfTotal: Math.round((props.length / total) * 100)
    })
  })
  
  return breakdown.sort((a, b) => b.count - a.count)
}

/**
 * Calculate geographic breakdown
 */
function calculateGeoBreakdown(properties: RawPropertyData[]): GeoBreakdown[] {
  const cities = new Map<string, RawPropertyData[]>()
  
  properties.forEach(p => {
    const city = p.city || 'Unknown'
    if (!cities.has(city)) {
      cities.set(city, [])
    }
    cities.get(city)!.push(p)
  })
  
  const breakdown: GeoBreakdown[] = []
  
  cities.forEach((props, city) => {
    const prices = props.map(p => p.price).filter(p => p > 0)
    const soldProps = props.filter(p => p.status?.toLowerCase() === 'sold')
    const daysOnMarket = props
      .map(p => p.daysOnMarket)
      .filter((d): d is number => d !== undefined && d !== null)
    
    breakdown.push({
      city,
      count: props.length,
      avgPrice: prices.length > 0 ? Math.round(ss.mean(prices)) : 0,
      soldCount: soldProps.length,
      avgDaysOnMarket: daysOnMarket.length > 0 ? Math.round(ss.mean(daysOnMarket)) : 0
    })
  })
  
  return breakdown.sort((a, b) => b.count - a.count).slice(0, 20) // Top 20 cities
}

/**
 * Calculate price distribution for histogram
 */
function calculatePriceDistribution(properties: RawPropertyData[]): {
  ranges: string[]
  counts: number[]
} {
  const prices = properties.map(p => p.price).filter(p => p > 0)
  
  if (prices.length === 0) {
    return { ranges: [], counts: [] }
  }
  
  // Create price buckets
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const bucketCount = 10
  const bucketSize = (max - min) / bucketCount
  
  const ranges: string[] = []
  const counts: number[] = []
  
  for (let i = 0; i < bucketCount; i++) {
    const low = Math.round((min + i * bucketSize) / 1000)
    const high = Math.round((min + (i + 1) * bucketSize) / 1000)
    ranges.push(`$${low}K-${high}K`)
    
    const count = prices.filter(p => 
      p >= min + i * bucketSize && 
      (i === bucketCount - 1 ? p <= max : p < min + (i + 1) * bucketSize)
    ).length
    counts.push(count)
  }
  
  return { ranges, counts }
}

/**
 * Generate human-readable insights
 */
function generateInsights(
  overview: MarketOverview,
  trends: TrendAnalysis,
  byType: PropertyTypeBreakdown[]
): string[] {
  const insights: string[] = []
  
  // Market type insight
  if (trends.marketType === 'seller') {
    insights.push(`Strong seller's market with ${overview.monthsOfSupply} months of supply`)
  } else if (trends.marketType === 'buyer') {
    insights.push(`Buyer's market with ${overview.monthsOfSupply} months of supply`)
  } else {
    insights.push(`Balanced market with ${overview.monthsOfSupply} months of supply`)
  }
  
  // Price trend
  if (trends.pricesTrending === 'up') {
    insights.push(`Prices trending upward with ${overview.yoyPriceGrowth}% YoY growth`)
  } else if (trends.pricesTrending === 'down') {
    insights.push(`Prices trending downward, ${Math.abs(overview.yoyPriceGrowth)}% below last year`)
  }
  
  // Sales velocity
  if (overview.momSalesGrowth > 10) {
    insights.push(`Sales momentum strong: ${overview.momSalesGrowth}% increase from last month`)
  } else if (overview.momSalesGrowth < -10) {
    insights.push(`Sales slowing: ${Math.abs(overview.momSalesGrowth)}% decrease from last month`)
  }
  
  // Days on market
  if (overview.avgDaysOnMarket < 30) {
    insights.push(`Fast-moving market: properties selling in ${overview.avgDaysOnMarket} days average`)
  } else if (overview.avgDaysOnMarket > 90) {
    insights.push(`Extended selling times: ${overview.avgDaysOnMarket} days average on market`)
  }
  
  // Property type insights
  if (byType.length > 0) {
    const dominant = byType[0]
    insights.push(`${dominant.type} properties dominate at ${dominant.percentOfTotal}% of listings`)
  }
  
  // Seasonality
  if (trends.seasonalityFactor > 1.2) {
    insights.push(`Currently in peak season (${Math.round((trends.seasonalityFactor - 1) * 100)}% above average activity)`)
  } else if (trends.seasonalityFactor < 0.8) {
    insights.push(`Currently in slow season (${Math.round((1 - trends.seasonalityFactor) * 100)}% below average activity)`)
  }
  
  return insights
}

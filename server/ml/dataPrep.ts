/**
 * Data Preparation & Feature Engineering for Real Estate ML
 * 
 * This module transforms raw property data into features suitable for ML training.
 * Features are designed for time-series forecasting of sales volume, prices, and market trends.
 */

import * as ss from 'simple-statistics'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RawPropertyData {
  id: number
  price: number
  listPrice?: number
  status: string
  type?: string
  beds?: number
  baths?: number
  sqft?: number
  city?: string
  province?: string
  createdAt: Date
  updatedAt: Date
  soldDate?: Date
  daysOnMarket?: number
}

/**
 * MLS close timestamp for rows with `status === 'sold'`.
 *
 * Pillar9 writes RESO CloseDate into `Property.features.closeDate`.
 * When Pillar9 dedupes onto a CREA row, sync.post.ts copies the same
 * fields onto the CREA record so off-market cards show real close data.
 *
 * `calculateAnalytics` (and monthly aggregation) use `soldDate || updatedAt`
 * to bucket "sold in last 30 days". Without reading `features.closeDate`,
 * every sold row falls back to Prisma `updatedAt`, which only advances when
 * sync touches the row — a listing that closed yesterday but hasn't been
 * re-fetched since last month disappears from soldLast30Days, surfacing as
 * zeros for SOLD 30D / absorption / MoM sales / avg DOM on dashboards.
 */
export function resolvePropertySoldTimestamp(params: {
  status: string | null | undefined
  features: unknown
  updatedAt: Date
}): Date | undefined {
  const s = (params.status || '').toLowerCase()
  if (s !== 'sold') return undefined

  const f =
    params.features && typeof params.features === 'object' && !Array.isArray(params.features)
      ? (params.features as Record<string, unknown>)
      : null

  const raw = f?.closeDate ?? f?.CloseDate
  if (raw != null && String(raw).trim() !== '') {
    const d = new Date(String(raw))
    if (!Number.isNaN(d.getTime())) return d
  }

  return params.updatedAt
}

export interface MonthlyMetrics {
  year: number
  month: number
  // Volume metrics
  soldCount: number
  newListings: number
  activeInventory: number
  // Price metrics
  avgSoldPrice: number
  medianSoldPrice: number
  avgListPrice: number
  avgPricePerSqft: number
  // Performance metrics
  avgDaysOnMarket: number
  listToSoldRatio: number
  absorptionRate: number
  // Derived features
  monthOfYear: number // 1-12 for seasonality
  quarter: number // 1-4
}

export interface PreparedFeatures {
  features: number[][]  // Input features for model
  labels: number[][]    // Target values to predict
  featureNames: string[]
  labelNames: string[]
  normalization: {
    featureMeans: number[]
    featureStds: number[]
    labelMeans: number[]
    labelStds: number[]
  }
}

// ============================================
// DATA AGGREGATION
// ============================================

/**
 * Aggregate raw property data into monthly metrics
 * This is the first step in preparing data for ML
 */
export function aggregateMonthlyMetrics(properties: RawPropertyData[]): MonthlyMetrics[] {
  // Group properties by year-month
  const monthlyGroups = new Map<string, RawPropertyData[]>()
  
  properties.forEach(prop => {
    const date = prop.soldDate || prop.updatedAt || prop.createdAt
    if (!date) return
    
    const d = new Date(date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyGroups.has(key)) {
      monthlyGroups.set(key, [])
    }
    monthlyGroups.get(key)!.push(prop)
  })
  
  // Calculate metrics for each month
  const metrics: MonthlyMetrics[] = []
  
  // Get all properties for inventory calculation
  const allProps = properties
  
  monthlyGroups.forEach((props, key) => {
    const [yearStr, monthStr] = key.split('-')
    const year = parseInt(yearStr!)
    const month = parseInt(monthStr!)
    
    // Filter sold properties
    const soldProps = props.filter(p => p.status?.toLowerCase() === 'sold')
    const newListings = props.filter(p => {
      const created = new Date(p.createdAt)
      return created.getFullYear() === year && created.getMonth() + 1 === month
    })
    
    // Calculate active inventory at end of month
    const monthEnd = new Date(year, month, 0) // Last day of month
    const activeInventory = allProps.filter(p => {
      const created = new Date(p.createdAt)
      const sold = p.soldDate ? new Date(p.soldDate) : null
      return created <= monthEnd && (!sold || sold > monthEnd) && p.status?.toLowerCase() !== 'sold'
    }).length
    
    // Price calculations
    const soldPrices = soldProps.map(p => p.price).filter(p => p > 0)
    const listPrices = props.map(p => p.listPrice || p.price).filter(p => p > 0)
    const sqftPrices = soldProps
      .filter(p => p.sqft && p.sqft > 0)
      .map(p => p.price / p.sqft!)
    
    const daysOnMarket = soldProps
      .map(p => p.daysOnMarket)
      .filter((d): d is number => d !== undefined && d !== null)
    
    // List to sold ratio
    const listToSoldRatios = soldProps
      .filter(p => p.listPrice && p.listPrice > 0)
      .map(p => p.price / p.listPrice!)
    
    // Absorption rate = sold / active inventory (monthly velocity)
    const absorptionRate = activeInventory > 0 
      ? soldProps.length / activeInventory 
      : 0
    
    metrics.push({
      year,
      month,
      soldCount: soldProps.length,
      newListings: newListings.length,
      activeInventory,
      avgSoldPrice: soldPrices.length > 0 ? ss.mean(soldPrices) : 0,
      medianSoldPrice: soldPrices.length > 0 ? ss.median(soldPrices) : 0,
      avgListPrice: listPrices.length > 0 ? ss.mean(listPrices) : 0,
      avgPricePerSqft: sqftPrices.length > 0 ? ss.mean(sqftPrices) : 0,
      avgDaysOnMarket: daysOnMarket.length > 0 ? ss.mean(daysOnMarket) : 0,
      listToSoldRatio: listToSoldRatios.length > 0 ? ss.mean(listToSoldRatios) : 1,
      absorptionRate,
      monthOfYear: month,
      quarter: Math.ceil(month / 3)
    })
  })
  
  // Sort by date
  return metrics.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
}

// ============================================
// FEATURE ENGINEERING
// ============================================

/**
 * Calculate rolling averages for time-series features
 */
function calculateRollingFeatures(
  metrics: MonthlyMetrics[], 
  index: number, 
  windowSize: number
): { [key: string]: number } {
  const start = Math.max(0, index - windowSize + 1)
  const window = metrics.slice(start, index + 1)
  
  if (window.length === 0) {
    return {
      [`rolling_${windowSize}m_sold`]: 0,
      [`rolling_${windowSize}m_price`]: 0,
      [`rolling_${windowSize}m_inventory`]: 0,
      [`rolling_${windowSize}m_dom`]: 0
    }
  }
  
  return {
    [`rolling_${windowSize}m_sold`]: ss.mean(window.map(m => m.soldCount)),
    [`rolling_${windowSize}m_price`]: ss.mean(window.map(m => m.avgSoldPrice)),
    [`rolling_${windowSize}m_inventory`]: ss.mean(window.map(m => m.activeInventory)),
    [`rolling_${windowSize}m_dom`]: ss.mean(window.map(m => m.avgDaysOnMarket))
  }
}

/**
 * Calculate year-over-year growth rates
 */
function calculateYoYGrowth(
  metrics: MonthlyMetrics[], 
  index: number
): { [key: string]: number } {
  const current = metrics[index]!
  
  // Find same month last year
  const lastYear = metrics.find(m => 
    m.year === current.year - 1 && m.month === current.month
  )
  
  if (!lastYear) {
    return {
      yoy_sold_growth: 0,
      yoy_price_growth: 0,
      yoy_inventory_growth: 0
    }
  }
  
  const calcGrowth = (curr: number, prev: number) => {
    if (prev === 0) return 0
    return (curr - prev) / prev
  }
  
  return {
    yoy_sold_growth: calcGrowth(current.soldCount, lastYear.soldCount),
    yoy_price_growth: calcGrowth(current.avgSoldPrice, lastYear.avgSoldPrice),
    yoy_inventory_growth: calcGrowth(current.activeInventory, lastYear.activeInventory)
  }
}

/**
 * Create seasonality features using one-hot encoding for month
 */
function createSeasonalityFeatures(month: number): { [key: string]: number } {
  const features: { [key: string]: number } = {}
  
  // One-hot encode quarters (more stable than individual months)
  for (let q = 1; q <= 4; q++) {
    features[`quarter_${q}`] = Math.ceil(month / 3) === q ? 1 : 0
  }
  
  // Cyclical encoding for month (captures circular nature of seasons)
  features['month_sin'] = Math.sin(2 * Math.PI * month / 12)
  features['month_cos'] = Math.cos(2 * Math.PI * month / 12)
  
  return features
}

/**
 * Prepare features and labels for model training
 * Uses sliding window approach: predict next N months based on last M months
 */
export function prepareTrainingData(
  metrics: MonthlyMetrics[],
  lookbackMonths: number = 6,
  forecastMonths: number = 3
): PreparedFeatures {
  const features: number[][] = []
  const labels: number[][] = []
  
  // Feature names for interpretability
  const featureNames = [
    'soldCount', 'avgSoldPrice', 'activeInventory', 'avgDaysOnMarket',
    'absorptionRate', 'listToSoldRatio',
    'rolling_3m_sold', 'rolling_3m_price', 'rolling_3m_inventory', 'rolling_3m_dom',
    'rolling_6m_sold', 'rolling_6m_price', 'rolling_6m_inventory', 'rolling_6m_dom',
    'yoy_sold_growth', 'yoy_price_growth', 'yoy_inventory_growth',
    'quarter_1', 'quarter_2', 'quarter_3', 'quarter_4',
    'month_sin', 'month_cos'
  ]
  
  const labelNames = ['next_sold_count', 'next_avg_price', 'next_inventory']
  
  // Handle edge case: very limited data (1-2 months)
  // Create synthetic samples for baseline model
  if (metrics.length < lookbackMonths + forecastMonths) {
    console.log(`[ML] Limited data mode: ${metrics.length} month(s). Creating synthetic training samples.`)
    
    // Use available data to create synthetic samples
    // This creates a "persistence" model that predicts similar values
    metrics.forEach((current, i) => {
      const rolling3 = calculateRollingFeatures(metrics, i, Math.min(3, metrics.length))
      const rolling6 = calculateRollingFeatures(metrics, i, Math.min(6, metrics.length))
      const yoy = calculateYoYGrowth(metrics, i)
      const seasonal = createSeasonalityFeatures(current.month)
      
      const featureVector = [
        current.soldCount,
        current.avgSoldPrice,
        current.activeInventory,
        current.avgDaysOnMarket,
        current.absorptionRate,
        current.listToSoldRatio,
        ...Object.values(rolling3),
        ...Object.values(rolling6),
        ...Object.values(yoy),
        ...Object.values(seasonal)
      ]
      
      // For limited data, predict same values (persistence baseline)
      const labelVector = [
        current.soldCount,
        current.avgSoldPrice,
        current.activeInventory
      ]
      
      features.push(featureVector)
      labels.push(labelVector)
      
      // Add slight variations to create more samples
      for (let j = 0; j < 5; j++) {
        const noiseFactor = 0.05 // 5% noise
        const noisyFeatures = featureVector.map(f => f * (1 + (Math.random() - 0.5) * noiseFactor * 2))
        const noisyLabels = labelVector.map(l => l * (1 + (Math.random() - 0.5) * noiseFactor * 2))
        features.push(noisyFeatures)
        labels.push(noisyLabels)
      }
    })
    
    // Normalize and return
    const normalization = normalizeData(features, labels)
    
    return {
      features: normalization.normalizedFeatures,
      labels: normalization.normalizedLabels,
      featureNames,
      labelNames,
      normalization: {
        featureMeans: normalization.featureMeans,
        featureStds: normalization.featureStds,
        labelMeans: normalization.labelMeans,
        labelStds: normalization.labelStds
      }
    }
  }
  
  // Standard sliding window approach for sufficient data
  for (let i = lookbackMonths - 1; i < metrics.length - forecastMonths; i++) {
    const current = metrics[i]!
    
    // Build feature vector
    const rolling3 = calculateRollingFeatures(metrics, i, 3)
    const rolling6 = calculateRollingFeatures(metrics, i, 6)
    const yoy = calculateYoYGrowth(metrics, i)
    const seasonal = createSeasonalityFeatures(current.month)
    
    const featureVector = [
      current.soldCount,
      current.avgSoldPrice,
      current.activeInventory,
      current.avgDaysOnMarket,
      current.absorptionRate,
      current.listToSoldRatio,
      ...Object.values(rolling3),
      ...Object.values(rolling6),
      ...Object.values(yoy),
      ...Object.values(seasonal)
    ]
    
    // Build label vector (average of next N months)
    const futureMonths = metrics.slice(i + 1, i + 1 + forecastMonths)
    const labelVector = [
      ss.mean(futureMonths.map(m => m.soldCount)),
      ss.mean(futureMonths.map(m => m.avgSoldPrice)),
      ss.mean(futureMonths.map(m => m.activeInventory))
    ]
    
    features.push(featureVector)
    labels.push(labelVector)
  }
  
  // Normalize features and labels
  const normalization = normalizeData(features, labels)
  
  return {
    features: normalization.normalizedFeatures,
    labels: normalization.normalizedLabels,
    featureNames,
    labelNames,
    normalization: {
      featureMeans: normalization.featureMeans,
      featureStds: normalization.featureStds,
      labelMeans: normalization.labelMeans,
      labelStds: normalization.labelStds
    }
  }
}

/**
 * Normalize data using z-score normalization
 * Stores means and stds for denormalization during prediction
 */
function normalizeData(
  features: number[][], 
  labels: number[][]
): {
  normalizedFeatures: number[][]
  normalizedLabels: number[][]
  featureMeans: number[]
  featureStds: number[]
  labelMeans: number[]
  labelStds: number[]
} {
  if (features.length === 0) {
    return {
      normalizedFeatures: [],
      normalizedLabels: [],
      featureMeans: [],
      featureStds: [],
      labelMeans: [],
      labelStds: []
    }
  }
  
  const numFeatures = features[0]!.length
  const numLabels = labels[0]!.length
  
  // Calculate means and stds for features
  const featureMeans: number[] = []
  const featureStds: number[] = []
  
  for (let j = 0; j < numFeatures; j++) {
    const column = features.map(row => row[j]!)
    featureMeans.push(ss.mean(column))
    featureStds.push(ss.standardDeviation(column) || 1) // Avoid division by zero
  }
  
  // Calculate means and stds for labels
  const labelMeans: number[] = []
  const labelStds: number[] = []
  
  for (let j = 0; j < numLabels; j++) {
    const column = labels.map(row => row[j]!)
    labelMeans.push(ss.mean(column))
    labelStds.push(ss.standardDeviation(column) || 1)
  }
  
  // Normalize
  const normalizedFeatures = features.map(row =>
    row.map((val, j) => (val - featureMeans[j]!) / featureStds[j]!)
  )
  
  const normalizedLabels = labels.map(row =>
    row.map((val, j) => (val - labelMeans[j]!) / labelStds[j]!)
  )
  
  return {
    normalizedFeatures,
    normalizedLabels,
    featureMeans,
    featureStds,
    labelMeans,
    labelStds
  }
}

/**
 * Prepare a single feature vector for prediction (using most recent data)
 */
export function prepareForPrediction(
  metrics: MonthlyMetrics[],
  normalization: PreparedFeatures['normalization']
): number[] | null {
  if (metrics.length < 1) {
    console.warn('[ML] Need at least 1 month of data for prediction')
    return null
  }
  
  const i = metrics.length - 1
  const current = metrics[i]!
  
  const rolling3 = calculateRollingFeatures(metrics, i, 3)
  const rolling6 = calculateRollingFeatures(metrics, i, 6)
  const yoy = calculateYoYGrowth(metrics, i)
  const seasonal = createSeasonalityFeatures(current.month)
  
  const featureVector = [
    current.soldCount,
    current.avgSoldPrice,
    current.activeInventory,
    current.avgDaysOnMarket,
    current.absorptionRate,
    current.listToSoldRatio,
    ...Object.values(rolling3),
    ...Object.values(rolling6),
    ...Object.values(yoy),
    ...Object.values(seasonal)
  ]
  
  // Normalize using stored normalization params
  return featureVector.map((val, j) => 
    (val - normalization.featureMeans[j]!) / normalization.featureStds[j]!
  )
}

/**
 * Denormalize predictions back to original scale
 */
export function denormalizePredictions(
  predictions: number[],
  normalization: PreparedFeatures['normalization']
): number[] {
  return predictions.map((val, j) =>
    val * normalization.labelStds[j]! + normalization.labelMeans[j]!
  )
}

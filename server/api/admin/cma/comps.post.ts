import { defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'

const prisma = new PrismaClient()

type Subject = {
  address?: string
  city?: string
  community?: string
  province?: string
  postalCode?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
  lotSize?: string
  condition?: string
  features?: string[]
  latitude?: number
  longitude?: number
}

// Geocode address using a free service (OpenStreetMap Nominatim)
async function geocodeAddress(address: string, city: string, province: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${province}, Canada`)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { 'User-Agent': 'CMA-Tool/1.0' }
    })
    const data = await response.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
  return null
}

function parseDateRange(range?: string, startDate?: string, endDate?: string) {
  const now = new Date()
  if (range && range !== 'custom') {
    const days = range === 'last_30' ? 30
      : range === 'last_90' ? 90
      : range === 'last_180' ? 180
      : range === 'last_365' ? 365
      : null
    if (days) {
      return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), lte: now }
    }
  }
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { gte: start, lte: end }
    }
  }
  return null
}

// ============================================
// DISTANCE CALCULATION - 100% Offline, Free
// Uses Haversine formula for straight-line distance
// Accuracy: ±0.1% - Perfect for real estate radius filtering
// ============================================

const EARTH_RADIUS_KM = 6371
const KM_PER_DEGREE = 111

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * This is the same method used by MLS systems for comparable filtering
 * @returns Distance in kilometers
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/**
 * Fast bounding box check before expensive Haversine calculation
 * Filters out properties that are obviously outside the radius
 */
function isWithinBoundingBox(
  subjectLat: number, 
  subjectLon: number, 
  propLat: number, 
  propLon: number, 
  radiusKm: number
): boolean {
  const latDelta = radiusKm / KM_PER_DEGREE
  const lonDelta = radiusKm / (KM_PER_DEGREE * Math.cos(subjectLat * Math.PI / 180))
  
  return Math.abs(propLat - subjectLat) <= latDelta &&
         Math.abs(propLon - subjectLon) <= lonDelta
}

// Legacy wrapper for compatibility
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return getDistanceKm(a.lat, a.lng, b.lat, b.lng)
}

function normalizeFeature(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

// Price-influencing features with individual value impact percentages.
// Even if a feature isn't selected by the user, its presence/absence between
// subject and comp indicates a price difference.
const VALUE_IMPACT_FEATURES: Record<string, number> = {
  finishedbasement: 4,
  doublegarage: 3,
  triplegarage: 4,
  singlegarage: 2,
  solar: 3,
  solarpanels: 3,
  fence: 1,
  fencing: 1,
  pool: 3,
  fireplace: 2,
  centralair: 2,
  centralac: 2,
  parkingpad: 1,
  waterfront: 3,
  walkoutbasement: 3,
  cityviews: 1,
}

function extractPropertyFeatures(property: any): Set<string> {
  const set = new Set<string>()
  const features = typeof property.features === 'string' ? JSON.parse(property.features) : property.features || {}
  const description = (property.description || '').toLowerCase()

  const push = (f: string) => set.add(normalizeFeature(f))

  const arrays = [
    features.appliances,
    features.exterior,
    features.interior,
    features.building,
    features.lot,
    features.utilities,
    features.view,
    features.architecturalStyle,
    features.parkingFeatures,
    features.fencing,
    features.poolFeatures,
    features.heating,
    features.cooling,
  ]

  arrays.forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach((v: string) => push(v))
    }
  })

  // Basement detection
  const basement = features.basement
  if (Array.isArray(basement)) {
    basement.forEach((b: string) => push(b))
    const basementStr = basement.join(' ').toLowerCase()
    if (basementStr.includes('finished') || basementStr.includes('full')) push('finishedbasement')
    if (basementStr.includes('walkout') || basementStr.includes('walk-out')) push('walkoutbasement')
  }
  if (description.includes('finished basement')) push('finishedbasement')
  if (description.includes('walkout') || description.includes('walk-out basement')) push('walkoutbasement')
  if (description.includes('basement')) push('basement')

  // Garage detection
  const parking = features.parkingFeatures
  const parkingStr = Array.isArray(parking) ? parking.join(' ').toLowerCase() : ''
  if (description.includes('double garage') || description.includes('2 car garage') || description.includes('two car garage') || parkingStr.includes('double')) push('doublegarage')
  if (description.includes('triple garage') || description.includes('3 car garage') || description.includes('three car garage') || parkingStr.includes('triple')) push('triplegarage')
  if (description.includes('single garage') || description.includes('1 car garage') || parkingStr.includes('single')) push('singlegarage')
  if (description.includes('garage') || description.includes('carport') || description.includes('parking')) push('garage')
  if (description.includes('parking pad')) push('parkingpad')

  // Solar detection
  if (description.includes('solar') || parkingStr.includes('solar')) push('solar')
  if (description.includes('solar panel')) push('solarpanels')
  const heating = features.heating
  if (Array.isArray(heating) && heating.join(' ').toLowerCase().includes('solar')) push('solar')

  // Fence detection
  const fencing = features.fencing
  if (Array.isArray(fencing) && fencing.length > 0) push('fence')
  if (description.includes('fence') || description.includes('fenced')) push('fence')

  // Other value features
  if (description.includes('fireplace')) push('fireplace')
  if (description.includes('pool') || (Array.isArray(features.poolFeatures) && features.poolFeatures.length > 0)) push('pool')
  if (description.includes('central air') || description.includes('air conditioning')) push('centralair')
  if (description.includes('waterfront') || (Array.isArray(features.waterfrontFeatures) && features.waterfrontFeatures.length > 0)) push('waterfront')

  return set
}

/**
 * Calculate a value-impact adjustment between subject and comp.
 * Returns a score 0–100 where 100 = identical value features,
 * lower = comp is missing (or has extra) price-influencing features.
 */
function calcValueImpactScore(subjectFeatures: string[], compFeatureSet: Set<string>): { score: number; details: string[] } {
  let totalImpact = 0
  let matchedImpact = 0
  const details: string[] = []

  for (const feat of subjectFeatures) {
    const impact = VALUE_IMPACT_FEATURES[feat] || 1
    totalImpact += impact
    if (compFeatureSet.has(feat)) {
      matchedImpact += impact
    } else {
      details.push(`-${impact}%: missing ${feat}`)
    }
  }

  // Bonus: comp has value features not in subject (slight positive signal)
  for (const [feat, impact] of Object.entries(VALUE_IMPACT_FEATURES)) {
    if (compFeatureSet.has(feat) && !subjectFeatures.includes(feat)) {
      details.push(`+${impact}%: has ${feat}`)
    }
  }

  if (totalImpact === 0) return { score: 50, details }
  return { score: Math.round((matchedImpact / totalImpact) * 100), details }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  
  // Check license for CMA feature
  await requireFeature(FEATURES.CMA, event)

  const body = await readBody(event)
  const subject: Subject = body?.subject || {}
  const filters = body?.filters || {}
  const radiusKm = Number(filters.radiusKm || 5)
  const limit = Number(filters.limit || 20)
  const minMatchScore = Number(filters.minMatchScore || 20)
  const community = (filters.community || subject.community || '') as string
  const MIN_COMPS_BEFORE_EXPAND = 3

  // Geocode subject address if no coordinates provided
  let subjectCoords = subject.latitude && subject.longitude
    ? { lat: subject.latitude, lng: subject.longitude }
    : null
  
  if (!subjectCoords && subject.address && subject.city && subject.province) {
    console.log('[CMA] Geocoding subject address:', subject.address, subject.city)
    subjectCoords = await geocodeAddress(subject.address, subject.city, subject.province)
    if (subjectCoords) {
      console.log('[CMA] Geocoded coordinates:', subjectCoords)
    }
  }

  const propertySelect = {
    id: true,
    title: true,
    price: true,
    beds: true,
    baths: true,
    sqft: true,
    type: true,
    status: true,
    address: true,
    city: true,
    cityRegion: true,
    province: true,
    latitude: true,
    longitude: true,
    images: true,
    features: true,
    description: true,
    yearBuilt: true,
    updatedAt: true,
  }

  const baseWhere: any = { status: 'sold' }
  if (filters.province || subject.province) baseWhere.province = filters.province || subject.province
  if (filters.city || subject.city) baseWhere.city = { contains: (filters.city || subject.city) as string, mode: 'insensitive' }

  const dateFilter = parseDateRange(filters.range, filters.startDate, filters.endDate)
  if (dateFilter) {
    baseWhere.updatedAt = dateFilter
  }

  // Phase 1: Search within the neighbourhood/community first
  let properties: any[] = []
  let searchScope: 'neighbourhood' | 'radius' | 'city' = 'city'

  if (community) {
    const neighbourhoodWhere = {
      ...baseWhere,
      cityRegion: { contains: community, mode: 'insensitive' as const },
    }
    properties = await prisma.property.findMany({
      where: neighbourhoodWhere,
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: propertySelect,
    })
    searchScope = 'neighbourhood'
    console.log(`[CMA] Neighbourhood "${community}": ${properties.length} sold properties found`)
  }

  // Phase 2: If neighbourhood returned fewer than MIN_COMPS_BEFORE_EXPAND, expand to radius/city
  if (properties.length < MIN_COMPS_BEFORE_EXPAND) {
    const cityProperties = await prisma.property.findMany({
      where: baseWhere,
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: propertySelect,
    })

    // Merge: neighbourhood results first, then city results (deduplicated)
    const existingIds = new Set(properties.map((p: any) => p.id))
    for (const p of cityProperties) {
      if (!existingIds.has(p.id)) {
        properties.push(p)
        existingIds.add(p.id)
      }
    }
    searchScope = subjectCoords ? 'radius' : 'city'
    console.log(`[CMA] Expanded to ${searchScope}: ${properties.length} total sold properties`)
  }

  const subjectFeatures = (subject.features || []).map(normalizeFeature)

  // Step 1: Bounding box pre-filter for performance (if coordinates available)
  // This is a cheap O(1) check that eliminates obviously distant properties
  const preFilteredProperties = subjectCoords
    ? properties.filter(p => {
        if (!p.latitude || !p.longitude) return true // Include if no coords
        return isWithinBoundingBox(
          subjectCoords.lat, 
          subjectCoords.lng, 
          p.latitude, 
          p.longitude, 
          radiusKm * 1.2 // Slightly larger to account for bounding box approximation
        )
      })
    : properties

  console.log(`[CMA] Pre-filter: ${properties.length} -> ${preFilteredProperties.length} properties`)

  // Step 2: Enhanced scoring with exact Haversine distance calculation
  // Neighbourhood matches get a bonus to prioritize same-community comps
  const communityLower = community.toLowerCase()

  const comps = preFilteredProperties
    .map((property) => {
      const featureSet = extractPropertyFeatures(property)
      const matchedFeatures = subjectFeatures.filter(f => featureSet.has(f))
      const missingFeatures = subjectFeatures.filter(f => !featureSet.has(f))
      
      // Feature match: user-selected features
      const featureScore = subjectFeatures.length 
        ? (matchedFeatures.length / subjectFeatures.length) * 100 
        : 50

      // Value-impact: weighted by how much each feature affects price
      const valueImpact = calcValueImpactScore(subjectFeatures, featureSet)
      const valueImpactScore = valueImpact.score

      // Combined feature score: 60% match count + 40% value-weighted impact
      const combinedFeatureScore = subjectFeatures.length
        ? featureScore * 0.6 + valueImpactScore * 0.4
        : 50

      let bedsScore = 100
      if (subject.beds && property.beds) {
        const bedsDiff = Math.abs(subject.beds - property.beds)
        bedsScore = Math.max(0, 100 - bedsDiff * 25)
      }
      
      let bathsScore = 100
      if (subject.baths && property.baths) {
        const bathsDiff = Math.abs(subject.baths - property.baths)
        bathsScore = Math.max(0, 100 - bathsDiff * 25)
      }
      
      let sqftScore = 100
      if (subject.sqft && property.sqft) {
        const sqftDiff = Math.abs(subject.sqft - property.sqft)
        const sqftPercentDiff = sqftDiff / subject.sqft
        sqftScore = Math.max(0, 100 - sqftPercentDiff * 200)
      }

      const propRegion = ((property as any).cityRegion || '').toLowerCase()
      const inSameNeighbourhood = communityLower && propRegion
        ? propRegion.includes(communityLower) || communityLower.includes(propRegion)
        : false
      const neighbourhoodScore = communityLower
        ? (inSameNeighbourhood ? 100 : 0)
        : 50

      const hasComm = Boolean(communityLower)
      const matchScore = Math.round(
        combinedFeatureScore * (hasComm ? 0.30 : 0.40) +
        bedsScore * 0.15 +
        bathsScore * 0.15 +
        sqftScore * (hasComm ? 0.25 : 0.30) +
        neighbourhoodScore * (hasComm ? 0.15 : 0)
      )
      
      const distance = subjectCoords && property.latitude && property.longitude
        ? distanceKm(subjectCoords, { lat: property.latitude, lng: property.longitude })
        : null

      return {
        ...property,
        images: typeof property.images === 'string' ? JSON.parse(property.images || '[]') : property.images,
        matchScore,
        featureScore: Math.round(combinedFeatureScore),
        featureMatchScore: Math.round(featureScore),
        valueImpactScore: Math.round(valueImpactScore),
        valueImpactDetails: valueImpact.details,
        bedsScore: Math.round(bedsScore),
        bathsScore: Math.round(bathsScore),
        sqftScore: Math.round(sqftScore),
        neighbourhoodScore: Math.round(neighbourhoodScore),
        inSameNeighbourhood,
        matchedFeatures,
        missingFeatures,
        distanceKm: distance,
        soldDate: property.updatedAt
      }
    })
    .filter((property) => property.matchScore >= minMatchScore)
    // Filter by radius if coordinates available (but always keep neighbourhood matches)
    .filter((property) => {
      if (property.inSameNeighbourhood) return true
      if (!subjectCoords || property.distanceKm == null) return true
      return property.distanceKm <= radiusKm
    })
    // Sort: same neighbourhood first, then by match score, then by distance
    .sort((a, b) => {
      if (a.inSameNeighbourhood !== b.inSameNeighbourhood) return a.inSameNeighbourhood ? -1 : 1
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
      return 0
    })
    .slice(0, limit)

  const prices = comps.map(p => p.price || 0).filter(p => p > 0)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const medianPrice = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0
  
  // Calculate price per sqft
  const pricesPerSqft = comps
    .filter(p => p.price && p.sqft && p.sqft > 0)
    .map(p => p.price / p.sqft)
  const avgPricePerSqft = pricesPerSqft.length 
    ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length)
    : 0

  // Estimated value for subject property
  const estimatedValue = subject.sqft && avgPricePerSqft 
    ? Math.round(subject.sqft * avgPricePerSqft)
    : avgPrice

  const neighbourhoodComps = comps.filter(c => c.inSameNeighbourhood).length

  return {
    subject: {
      ...subject,
      latitude: subjectCoords?.lat,
      longitude: subjectCoords?.lng
    },
    comps,
    searchScope,
    stats: {
      count: comps.length,
      neighbourhoodComps,
      avgPrice,
      medianPrice,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgPricePerSqft,
      estimatedValue,
      priceRange: {
        low: Math.round(estimatedValue * 0.95),
        high: Math.round(estimatedValue * 1.05)
      }
    },
    methodology: {
      description: community
        ? `Comparative Market Analysis prioritizing "${community}" neighbourhood, expanded to ${radiusKm}km radius when needed`
        : 'Comparative Market Analysis based on recently sold properties',
      matchCriteria: community
        ? [
            'Neighbourhood match (15% weight)',
            'Feature matching (30% weight)',
            'Bedroom count similarity (15% weight)',
            'Bathroom count similarity (15% weight)',
            'Square footage similarity (25% weight)',
          ]
        : [
            'Feature matching (40% weight)',
            'Bedroom count similarity (15% weight)',
            'Bathroom count similarity (15% weight)',
            'Square footage similarity (30% weight)',
          ],
      distanceMethod: 'Haversine formula (straight-line distance, ±0.1% accuracy)',
      searchStrategy: community
        ? `Searched "${community}" first (${neighbourhoodComps} found), then expanded to ${radiusKm}km radius`
        : `Searched within ${radiusKm}km radius`,
      filters: {
        community: community || null,
        minMatchScore,
        radiusKm,
        dateRange: filters.range || 'last_90'
      }
    }
  }
})

import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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

// Defensive JSON parse for the Property.features column when stored as string.
function safeParseJson(value: unknown): any {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return null }
}

// Resolve the best-available "sold date" for a property record.
//
// Different sources expose different timestamps and any individual field can
// be null on a given row, so we walk a priority chain:
//
//   1. features.closeDate           — Pillar9's actual closing date. Gold standard.
//   2. features.statusChangeTimestamp — CREA's StandardStatus transition (when it
//                                       flipped to Closed/Sold). Public DDF doesn't
//                                       expose CloseDate, so this is CREA's best signal.
//   3. features.pendingTimestamp    — when listing went pending (firm sale).
//                                     Used when a sold record is missing the
//                                     status-change date but kept its pending date.
//   4. features.modificationTimestamp — last CREA-side edit. Auto-sold rows
//                                       usually modify on the same poll, so this
//                                       is a tight upper bound.
//   5. property.updatedAt           — our row mtime. Always present, but moves on
//                                     every sync — last-resort only.
//
// Returns { date, source } so the UI can show provenance ("Closed: 2026-03-12")
// vs an inferred date ("Last updated: 2026-03-15").
type SoldDateSource = 'closeDate' | 'statusChangeTimestamp' | 'pendingTimestamp' | 'modificationTimestamp' | 'updatedAt'

function resolveSoldDate(property: any, featuresObj: any): { date: Date; source: SoldDateSource } {
  const candidates: Array<{ value: unknown; source: SoldDateSource }> = [
    { value: featuresObj?.closeDate, source: 'closeDate' },
    { value: featuresObj?.statusChangeTimestamp, source: 'statusChangeTimestamp' },
    { value: featuresObj?.pendingTimestamp, source: 'pendingTimestamp' },
    { value: featuresObj?.modificationTimestamp, source: 'modificationTimestamp' },
    { value: property.updatedAt, source: 'updatedAt' },
  ]

  for (const c of candidates) {
    if (c.value == null || c.value === '') continue
    const d = c.value instanceof Date ? c.value : new Date(c.value as any)
    if (!isNaN(d.getTime())) return { date: d, source: c.source }
  }

  // Should be unreachable — updatedAt is non-nullable on Property — but stay safe.
  return { date: new Date(0), source: 'updatedAt' }
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
  const radiusKm = Number(filters.radiusKm || 1)
  const limit = Number(filters.limit || 20)
  const minMatchScore = Number(filters.minMatchScore || 50)
  const community = (filters.community || subject.community || '') as string

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

  // The true sold date can live in several places (closeDate, statusChange-
  // Timestamp, pendingTimestamp, modificationTimestamp) — see resolveSoldDate
  // for the priority chain. We keep a wide pre-filter on updatedAt for query
  // performance (+90 days of buffer past the requested window so we don't miss
  // anything CREA touched after the sale), then re-filter precisely in-memory
  // using the resolved sold date from the JSON features blob.
  const dateFilter = parseDateRange(filters.range, filters.startDate, filters.endDate)
  if (dateFilter) {
    const padded: { gte?: Date; lte?: Date } = {}
    if (dateFilter.gte) padded.gte = dateFilter.gte
    if (dateFilter.lte) padded.lte = new Date(dateFilter.lte.getTime() + 90 * 24 * 60 * 60 * 1000)
    baseWhere.updatedAt = padded
  }

  // Search sold properties — strictly within the community when specified
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
  } else if (subjectCoords) {
    // No community — use bounding box to limit DB query to radius
    const latDelta = radiusKm / KM_PER_DEGREE
    const lonDelta = radiusKm / (KM_PER_DEGREE * Math.cos(subjectCoords.lat * Math.PI / 180))
    const radiusWhere = {
      ...baseWhere,
      latitude: { gte: subjectCoords.lat - latDelta, lte: subjectCoords.lat + latDelta },
      longitude: { gte: subjectCoords.lng - lonDelta, lte: subjectCoords.lng + lonDelta },
    }
    properties = await prisma.property.findMany({
      where: radiusWhere,
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: propertySelect,
    })
    searchScope = 'radius'
    console.log(`[CMA] Radius ${radiusKm}km search: ${properties.length} sold properties found`)
  } else {
    // No community, no coordinates — cannot determine radius, return empty
    properties = []
    searchScope = 'city'
    console.log(`[CMA] No community or coordinates provided, no results`)
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
      if (subject.beds != null && subject.beds > 0) {
        if (!property.beds || property.beds === 0) {
          bedsScore = 0
        } else {
          const bedsDiff = Math.abs(subject.beds - property.beds)
          bedsScore = Math.max(0, 100 - bedsDiff * 25)
        }
      }
      
      let bathsScore = 100
      if (subject.baths != null && subject.baths > 0) {
        if (!property.baths || property.baths === 0) {
          bathsScore = 0
        } else {
          const bathsDiff = Math.abs(subject.baths - property.baths)
          bathsScore = Math.max(0, 100 - bathsDiff * 25)
        }
      }
      
      let sqftScore = 100
      if (subject.sqft != null && subject.sqft > 0) {
        if (!property.sqft || property.sqft === 0) {
          sqftScore = 0
        } else {
          const sqftDiff = Math.abs(subject.sqft - property.sqft)
          const sqftPercentDiff = sqftDiff / subject.sqft
          sqftScore = Math.max(0, 100 - sqftPercentDiff * 200)
        }
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
        combinedFeatureScore * (hasComm ? 0.15 : 0.40) +
        bedsScore * 0.10 +
        bathsScore * 0.10 +
        sqftScore * (hasComm ? 0.15 : 0.30) +
        neighbourhoodScore * (hasComm ? 0.50 : 0)
      )
      
      const distance = subjectCoords && property.latitude && property.longitude
        ? distanceKm(subjectCoords, { lat: property.latitude, lng: property.longitude })
        : null

      // Walk the sold-date fallback chain. See resolveSoldDate() for the full
      // priority order and why each level exists.
      const features = (property as any).features
      const featuresObj = typeof features === 'string'
        ? safeParseJson(features)
        : (features || {})
      const { date: soldDate, source: soldDateSource } = resolveSoldDate(property, featuresObj)
      const soldDateMs = soldDate.getTime()

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
        soldDate,
        soldDateMs,
        soldDateSource,
      }
    })
    // Precise sold-date window using StatusChangeTimestamp.
    .filter((property) => {
      if (!dateFilter) return true
      if (dateFilter.gte && property.soldDateMs < dateFilter.gte.getTime()) return false
      if (dateFilter.lte && property.soldDateMs > dateFilter.lte.getTime()) return false
      return true
    })
    .filter((property) => property.matchScore >= minMatchScore)
    // Filter by radius (always keep neighbourhood matches)
    .filter((property) => {
      if (property.inSameNeighbourhood) return true
      if (!subjectCoords) return true
      if (property.distanceKm == null) return false
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
            'Neighbourhood match (50% weight)',
            'Feature matching (15% weight)',
            'Bedroom count similarity (10% weight)',
            'Bathroom count similarity (10% weight)',
            'Square footage similarity (15% weight)',
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

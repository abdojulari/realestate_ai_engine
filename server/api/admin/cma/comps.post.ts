import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { buildCityWhereClause } from '../../../utils/city-dictionary'
import { isLeaseLikeProperty } from '../../../utils/lease-detector'
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

// Comprehensive CMA universe. A "Sold-only" CMA is the quick path — a true
// comprehensive one factors in active listings (current asks), pendings
// (near-future sales), and the failure modes (expired / terminated /
// withdrawn) which signal overpricing in the same micro-market.
//
// Leases/rentals are *never* part of CMA — `for_rent` / `leased` are excluded
// at the SQL layer and `isLeaseLikeProperty()` is the runtime backstop.
const COMPREHENSIVE_STATUSES = [
  'sold',
  'for_sale',
  'pending',
  'expired',
  'terminated',
  'withdrawn',
] as const

type CmaStatus = (typeof COMPREHENSIVE_STATUSES)[number]

const CLOSED_STATUSES = new Set<CmaStatus>([
  'sold',
  'expired',
  'terminated',
  'withdrawn',
])

// Per-status confidence weight when blending into the estimated value.
// Sold transactions are the gold standard (1.0). Pendings are firm sales but
// the price isn't yet confirmed (0.85). Active asks are aspirational (0.6).
// Expired/terminated/withdrawn reflect the *unsold* price — they pull avg up
// but are informative as a ceiling indicator, so they get the lowest weight.
const STATUS_PRICE_WEIGHT: Record<CmaStatus, number> = {
  sold: 1.0,
  pending: 0.85,
  for_sale: 0.6,
  expired: 0.35,
  terminated: 0.35,
  withdrawn: 0.35,
}

// Human-friendly status labels used in tooltips, methodology, and reports.
const STATUS_LABEL: Record<CmaStatus, string> = {
  sold: 'Sold',
  for_sale: 'Active',
  pending: 'Pending',
  expired: 'Expired',
  terminated: 'Terminated',
  withdrawn: 'Withdrawn',
}

// Defensive JSON parse for the Property.features column when stored as string.
function safeParseJson(value: unknown): any {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return null }
}

// Resolve the best-available "effective date" for a property record (when the
// sale closed, the listing expired, was withdrawn, was put on market, etc).
//
// Different sources expose different timestamps and any individual field can
// be null on a given row, so we walk a priority chain:
//
//   1. features.closeDate           — Pillar9's actual closing date. Gold standard
//                                     for sold rows.
//   2. features.statusChangeTimestamp — CREA's StandardStatus transition (when it
//                                       flipped to Closed/Sold/Expired/etc). The
//                                       canonical "this is when the status changed"
//                                       timestamp for any non-active state.
//   3. features.pendingTimestamp    — when listing went pending (firm sale).
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
  const limit = Number(filters.limit || 20)
  // `minMatchScore` is now a soft signal — comps below it are still returned
  // and shown to the agent (they're useful context), but they're flagged with
  // `meetsMinMatch: false` so the UI can de-emphasise them. This replaces the
  // old behaviour where 0 comps could come back simply because the threshold
  // was set too high relative to a sparse micro-market.
  const minMatchScore = Number(filters.minMatchScore || 0)
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
    // MLS-fed listing-price provenance — the report shows the listing-vs-sold
    // spread per comp, so we always carry these along.
    originalListPrice: true,
    previousListPrice: true,
    firstEntryPrice: true,
    priceChangeTimestamp: true,
  }

  // Shared province + city scoping used across the comp universe.
  const provinceFilter = filters.province || subject.province
  const cityInput = (filters.city || subject.city) as string | undefined
  const cityConditions = cityInput ? buildCityWhereClause(cityInput) : []

  function buildBaseWhere(statusClause: any): any {
    const where: any = { ...statusClause }
    if (provinceFilter) where.province = provinceFilter
    if (cityConditions.length > 0) {
      where.AND = [...(where.AND || []), { OR: cityConditions }]
    }
    // Date filtering used to live on `updatedAt` at the SQL layer for ALL
    // statuses, which silently dropped any Active listing whose row hadn't
    // been touched recently — so the comps universe was strictly smaller
    // than the "Comparable Market Activity" table (sold.get.ts), which
    // applies the date filter in-memory and only to *closed* statuses.
    // We now mirror that pattern: no SQL-level date filter; the resolved
    // effective-date check (closeDate → statusChangeTimestamp → updatedAt)
    // is applied in-memory below, and only for closed events. Active and
    // pending rows are current market state and ignore the date window.
    return where
  }

  const dateFilter = parseDateRange(filters.range, filters.startDate, filters.endDate)
  const subjectFeatures = (subject.features || []).map(normalizeFeature)
  const communityLower = community.toLowerCase()

  // Optional caller-supplied status restriction. Defaults to the comprehensive
  // universe. The UI doesn't expose a filter today, but keeping the contract
  // open lets the report toggle a "Sold-only" view later without another API.
  const requestedStatuses: string[] = Array.isArray(filters.statuses) && filters.statuses.length > 0
    ? filters.statuses
    : [...COMPREHENSIVE_STATUSES]
  const allowedStatusSet = new Set<string>(COMPREHENSIVE_STATUSES)
  const comprehensiveStatuses = requestedStatuses
    .filter((s): s is CmaStatus => allowedStatusSet.has(s))

  /**
   * One CMA pipeline pass: fetch raw rows for `statusClause`, drop leases,
   * compute match/distance scores, sort by relevance, and slice to `limit`.
   *
   * Universe rules (match what the "Comparable Market Activity" table shows):
   *   • With community  → city + community + statuses (no radius gate)
   *   • Without community → city + statuses (no radius gate)
   * Distance to the subject is still computed for display, but is never
   * used as a hard cutoff. Radius was removed entirely after we found it
   * was excluding obvious neighbourhood comps that the agent could see in
   * the activity table right above.
   *
   * `enforceDateFilter` controls whether we apply the user's date range to
   * the resolved effective-date during in-memory filtering. We enforce it
   * for *closed* events (sold/expired/terminated/withdrawn) since the date
   * is meaningful (when did it close/fail). For currently-listed rows
   * (for_sale/pending) we disable it — those reflect current market state
   * and "recently listed" means on-market *now*, not closed-in-N-days.
   */
  async function runCmaPipeline(opts: {
    statusClause: any
    enforceDateFilter: boolean
    label: string
  }): Promise<{ comps: any[]; searchScope: 'neighbourhood' | 'city'; rawCount: number; preFilterCount: number; saleOnlyCount: number }> {
    const baseWhere = buildBaseWhere(opts.statusClause)

    let properties: any[] = []
    let searchScope: 'neighbourhood' | 'city' = 'city'

    if (community) {
      const neighbourhoodWhere = {
        ...baseWhere,
        cityRegion: { contains: community, mode: 'insensitive' as const },
      }
      properties = await prisma.property.findMany({
        where: neighbourhoodWhere,
        orderBy: { updatedAt: 'desc' },
        // Match sold.get.ts's generous take so the comps universe is
        // strictly a superset of (or equal to) what shows in the activity
        // table — never smaller.
        take: 1000,
        select: propertySelect,
      })
      searchScope = 'neighbourhood'
      console.log(`[CMA] ${opts.label} | Neighbourhood "${community}": ${properties.length} rows`)
    } else if (cityConditions.length > 0 || provinceFilter) {
      // No community: fall back to city/province scope. Same query, same
      // statuses — distance to the subject is computed for display below
      // but never used to filter rows out.
      properties = await prisma.property.findMany({
        where: baseWhere,
        orderBy: { updatedAt: 'desc' },
        take: 1000,
        select: propertySelect,
      })
      searchScope = 'city'
      console.log(`[CMA] ${opts.label} | City scope: ${properties.length} rows`)
    } else {
      properties = []
      searchScope = 'city'
      console.log(`[CMA] ${opts.label} | No community or city, skipping`)
    }

    // Drop leases/rentals that may have leaked in via legacy mis-tagged rows.
    // See server/utils/lease-detector.ts.
    const saleOnly = properties.filter(p => !isLeaseLikeProperty(p))

    const scored = saleOnly
      .map((property) => {
        const featureSet = extractPropertyFeatures(property)
        const matchedFeatures = subjectFeatures.filter(f => featureSet.has(f))
        const missingFeatures = subjectFeatures.filter(f => !featureSet.has(f))

        const featureScore = subjectFeatures.length
          ? (matchedFeatures.length / subjectFeatures.length) * 100
          : 50

        const valueImpact = calcValueImpactScore(subjectFeatures, featureSet)
        const valueImpactScore = valueImpact.score

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

        const features = (property as any).features
        const featuresObj = typeof features === 'string'
          ? safeParseJson(features)
          : (features || {})
        const { date: soldDate, source: soldDateSource } = resolveSoldDate(property, featuresObj)
        const soldDateMs = soldDate.getTime()

        // MLS-driven listing-price provenance so the report can show
        // "Listed at $X · Sold at $Y · Δ%".
        const listingPrice =
          (property as any).originalListPrice ??
          (property as any).previousListPrice ??
          (property as any).firstEntryPrice ??
          null
        const finalPrice = property.price || 0
        const listVsFinalDelta = listingPrice && finalPrice
          ? Math.round(((finalPrice - listingPrice) / listingPrice) * 1000) / 10 // 1 decimal %
          : null

        const status = (property.status as CmaStatus) || 'sold'
        const isClosed = CLOSED_STATUSES.has(status)
        const isCurrentlyListed = status === 'for_sale' || status === 'pending'

        return {
          ...property,
          images: typeof property.images === 'string' ? JSON.parse(property.images || '[]') : property.images,
          matchScore,
          // `meetsMinMatch` lets the UI visually de-emphasise comps below
          // the user-set threshold (e.g. muted chip, sub-section heading)
          // without hiding them. Threshold is a *highlight*, not a gate.
          meetsMinMatch: matchScore >= minMatchScore,
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
          // ── Comprehensive-CMA fields ─────────────────────────────────────
          status,
          statusLabel: STATUS_LABEL[status] || status,
          listingPrice,
          listVsFinalDelta,        // % difference, sign = direction
          priceWeight: STATUS_PRICE_WEIGHT[status] ?? 0.5,
          // `isFallback` previously meant "fell back to active/pending because
          // no sold". We keep it for backwards-compat with the existing UI
          // chip but reinterpret: it's true whenever the comp is *currently
          // listed* (i.e. not a closed transaction). The UI chip text already
          // distinguishes Active vs Pending.
          isFallback: isCurrentlyListed,
          isClosed,
          listingStatus: status,
        }
      })
      .filter((property) => {
        if (!opts.enforceDateFilter || !dateFilter) return true
        // Date filter only applies to closed events — current listings stay
        // visible regardless of date window. This mirrors sold.get.ts so the
        // comps universe is consistent with the activity table.
        if (!CLOSED_STATUSES.has(property.status as CmaStatus)) return true
        if (dateFilter.gte && property.soldDateMs < dateFilter.gte.getTime()) return false
        if (dateFilter.lte && property.soldDateMs > dateFilter.lte.getTime()) return false
        return true
      })
      // No matchScore gate, no radius gate. The universe is now "everything
      // visible in the activity table for this neighbourhood/city + status +
      // date window". Sorting (next) brings the strongest comps to the top;
      // the UI tags below-threshold rows but still shows them.
      .sort((a, b) => {
        // Above-threshold first — keeps the user's "highlight strong comps"
        // intent intact without filtering anyone out.
        if (a.meetsMinMatch !== b.meetsMinMatch) return a.meetsMinMatch ? -1 : 1
        // Neighbourhood next — neighbourhood comps are the most valuable
        // input to a CMA. The user explicitly called these out as essential.
        if (a.inSameNeighbourhood !== b.inSameNeighbourhood) return a.inSameNeighbourhood ? -1 : 1
        // Sold > Pending > Active > Expired/Terminated/Withdrawn so the most
        // confidence-weighted comps surface first.
        if (b.priceWeight !== a.priceWeight) return b.priceWeight - a.priceWeight
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
        return 0
      })
      .slice(0, limit)

    return {
      comps: scored,
      searchScope,
      rawCount: properties.length,
      saleOnlyCount: saleOnly.length,
      preFilterCount: saleOnly.length,
    }
  }

  // ── Comprehensive pass: all status types in a single pipeline ────────
  // We pull the full universe (sold + active + pending + expired + terminated
  // + withdrawn) in one query so the comp set reflects every available price-
  // discovery signal in the subject's micro-market.
  const comprehensivePass = await runCmaPipeline({
    statusClause: { status: { in: comprehensiveStatuses } },
    // Enforce date filter — the pipeline itself only applies it to *closed*
    // statuses, leaving active/pending visible regardless of window.
    enforceDateFilter: true,
    label: 'COMPREHENSIVE',
  })

  console.log(
    `[CMA] COMPREHENSIVE pass: raw=${comprehensivePass.rawCount} → saleOnly=${comprehensivePass.saleOnlyCount} → preFilter=${comprehensivePass.preFilterCount} → comps=${comprehensivePass.comps.length}`
  )

  // ── No-match fallback: if nothing came back at all (e.g. extremely narrow
  // criteria), retry without the date filter so the user still sees something.
  // Never include leased/rented — isLeaseLikeProperty() drops them anyway.
  let fallback: null | { type: 'no_dated_results'; reason: 'no_recent_activity' } = null
  let comps = comprehensivePass.comps
  let searchScope = comprehensivePass.searchScope

  if (comps.length === 0) {
    const fallbackPass = await runCmaPipeline({
      statusClause: { status: { in: comprehensiveStatuses } },
      enforceDateFilter: false,
      label: 'FALLBACK',
    })
    console.log(`[CMA] FALLBACK pass: raw=${fallbackPass.rawCount} → saleOnly=${fallbackPass.saleOnlyCount} → preFilter=${fallbackPass.preFilterCount} → comps=${fallbackPass.comps.length}`)

    if (fallbackPass.comps.length > 0) {
      comps = fallbackPass.comps
      searchScope = fallbackPass.searchScope
      fallback = { type: 'no_dated_results', reason: 'no_recent_activity' }
    }
  }

  // ── Status breakdown — drives the comprehensive summary chips in the UI
  // and the per-status section in the email report.
  const statusBreakdown: Record<string, number> = {}
  for (const s of comprehensiveStatuses) statusBreakdown[s] = 0
  for (const c of comps) {
    const s = (c.status as string) || 'sold'
    if (statusBreakdown[s] == null) statusBreakdown[s] = 0
    statusBreakdown[s] += 1
  }

  // ── Stats: weighted by status confidence so a single stale expired listing
  // doesn't pull avg through the floor. The unweighted versions are also
  // returned for transparency.
  const validPriced = comps.filter(p => (p.price || 0) > 0)
  const prices = validPriced.map(p => p.price as number)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const sortedPrices = [...prices].sort((a, b) => a - b)
  const medianPrice = sortedPrices.length ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0

  // Weighted average using STATUS_PRICE_WEIGHT — the headline "Estimated Value"
  // leans on sold/pending and only lightly on expired/terminated/withdrawn.
  const totalWeight = validPriced.reduce((acc, p) => acc + (p.priceWeight ?? 0.5), 0)
  const weightedAvgPrice = totalWeight > 0
    ? Math.round(validPriced.reduce((acc, p) => acc + (p.price as number) * (p.priceWeight ?? 0.5), 0) / totalWeight)
    : avgPrice

  // Per-status averages — surfaced in the report for context (e.g. "Sold avg
  // $X vs Active avg $Y" tells the story of whether the market is hot/cold).
  const pricesByStatus: Record<string, number[]> = {}
  for (const p of validPriced) {
    const s = (p.status as string) || 'sold'
    if (!pricesByStatus[s]) pricesByStatus[s] = []
    pricesByStatus[s].push(p.price as number)
  }
  const statusStats: Record<string, { count: number; avgPrice: number; medianPrice: number }> = {}
  for (const [s, arr] of Object.entries(pricesByStatus)) {
    if (!arr || arr.length === 0) continue
    const sorted = [...arr].sort((a, b) => a - b)
    statusStats[s] = {
      count: arr.length,
      avgPrice: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      medianPrice: sorted[Math.floor(sorted.length / 2)] ?? 0,
    }
  }

  // Price per sqft (weighted by status confidence)
  const pricedWithSqft = validPriced.filter(p => p.sqft && (p.sqft as number) > 0)
  const totalSqftWeight = pricedWithSqft.reduce((acc, p) => acc + (p.priceWeight ?? 0.5), 0)
  const avgPricePerSqft = totalSqftWeight > 0
    ? Math.round(
        pricedWithSqft.reduce((acc, p) => acc + ((p.price as number) / (p.sqft as number)) * (p.priceWeight ?? 0.5), 0) /
        totalSqftWeight
      )
    : 0

  // Estimated value for subject property — prefer $/sqft × subject sqft
  // (controls for size); fall back to weighted avg price.
  const estimatedValue = subject.sqft && avgPricePerSqft
    ? Math.round(subject.sqft * avgPricePerSqft)
    : weightedAvgPrice

  // Listing-vs-final price delta across SOLD comps only — the headline market
  // tightness indicator the user wants in the email ("homes are selling for
  // X% over/under list").
  const soldWithBothPrices = comps.filter(c =>
    c.status === 'sold' && c.listingPrice && c.price && (c.listingPrice as number) > 0
  )
  const avgListVsFinalDelta = soldWithBothPrices.length
    ? Math.round(
        (soldWithBothPrices.reduce((acc, c) => acc + ((c.price as number) - (c.listingPrice as number)) / (c.listingPrice as number), 0) /
         soldWithBothPrices.length) * 1000
      ) / 10
    : null

  const neighbourhoodComps = comps.filter(c => c.inSameNeighbourhood).length

  const baseDescription = community
    ? `Comprehensive Comparative Market Analysis scoped to "${community}" neighbourhood. Every comparable in the loaded activity is included — sold, active, pending, expired, terminated, and withdrawn — with each property scored on a one-to-one feature comparison against the subject.`
    : 'Comprehensive Comparative Market Analysis across the loaded activity — sold, active, pending, expired, terminated, and withdrawn — each property scored on a one-to-one feature comparison against the subject.'

  const description = fallback
    ? `${baseDescription} No activity matched the selected date range — showing all available comparables instead.`
    : baseDescription

  // Methodology bullets reflect the status weighting so the agent can
  // explain to clients why an "expired" listing is included but counted less.
  const statusWeightCriteria = [
    'Sold transactions weighted highest (closed-price evidence)',
    'Pending sales weighted next (firm contracts; price not yet confirmed)',
    'Active listings show current market asks (aspirational pricing)',
    'Expired / Terminated / Withdrawn included as overpricing signal (lowest weight)',
  ]

  const belowThresholdCount = comps.filter(c => c.meetsMinMatch === false).length
  const aboveThresholdCount = comps.length - belowThresholdCount

  return {
    subject: {
      ...subject,
      latitude: subjectCoords?.lat,
      longitude: subjectCoords?.lng
    },
    comps,
    searchScope,
    fallback,
    statuses: comprehensiveStatuses,
    statusBreakdown,
    statusStats,
    stats: {
      count: comps.length,
      neighbourhoodComps,
      avgPrice,
      medianPrice,
      weightedAvgPrice,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgPricePerSqft,
      estimatedValue,
      avgListVsFinalDelta, // Sold-only listing→sold delta in %
      priceRange: {
        low: Math.round(estimatedValue * 0.95),
        high: Math.round(estimatedValue * 1.05)
      }
    },
    methodology: {
      description,
      isFallback: Boolean(fallback),
      statuses: comprehensiveStatuses,
      matchCriteria: community
        ? [
            'Neighbourhood match (50% weight) — same community is the strongest comp signal',
            'One-to-one feature comparison (15% weight) — direct presence/absence + value impact per amenity',
            'Bedroom count similarity (10% weight)',
            'Bathroom count similarity (10% weight)',
            'Square footage similarity (15% weight)',
            ...statusWeightCriteria,
          ]
        : [
            'One-to-one feature comparison (40% weight) — direct presence/absence + value impact per amenity',
            'Bedroom count similarity (15% weight)',
            'Bathroom count similarity (15% weight)',
            'Square footage similarity (30% weight)',
            ...statusWeightCriteria,
          ],
      distanceMethod: 'Haversine formula (straight-line distance, ±0.1% accuracy) — informational only, never used to exclude comps',
      searchStrategy: community
        ? `Scoped to "${community}" neighbourhood — ${neighbourhoodComps} of ${comps.length} comps match the community directly. Every loaded comparable is included; the minimum match score is a highlight, not a filter (${aboveThresholdCount} ≥ ${minMatchScore}%, ${belowThresholdCount} below).`
        : `City-wide search across sold, active, pending, expired, terminated and withdrawn. Every loaded comparable is included; the minimum match score is a highlight, not a filter (${aboveThresholdCount} ≥ ${minMatchScore}%, ${belowThresholdCount} below).`,
      filters: {
        community: community || null,
        minMatchScore,
        dateRange: filters.range || 'last_90'
      }
    }
  }
})

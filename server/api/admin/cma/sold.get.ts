import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { creaService } from '../../../utils/crea.service'
import { buildCityWhereClause } from '../../../utils/city-dictionary'
import { isLeaseLikeProperty } from '../../../utils/lease-detector'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


// The comprehensive CMA universe — every sale-side status that gives us
// price-discovery signal for a property. Leases/rentals are excluded both
// here (no `leased` / `for_rent`) and by `isLeaseLikeProperty()` below.
//
// Why each status matters:
//   • sold        — closed transactions; the gold standard for valuation.
//   • for_sale    — what the market is actively asking *right now*.
//   • pending     — under contract; near-future sales price.
//   • expired     — failed listings; signal that the asking price was too high.
//   • terminated  — pulled before expiry; usually re-list events.
//   • withdrawn   — taken off market; same family as terminated.
//
// A "Sold-only" CMA is a quick comp pull. A comprehensive CMA includes all of
// the above so the agent can speak to listing-vs-sold spreads, market depth,
// and overpricing signals.
const COMPREHENSIVE_STATUSES = [
  'sold',
  'for_sale',
  'pending',
  'expired',
  'terminated',
  'withdrawn',
] as const

type ComprehensiveStatus = (typeof COMPREHENSIVE_STATUSES)[number]

// Closed-event statuses where the "effective date" (sold/expired/etc) actually
// belongs to a point in time. For these we apply the user's date range filter.
// Active and pending are *current* market state, so we don't gate them by date.
const CLOSED_STATUSES = new Set<ComprehensiveStatus>([
  'sold',
  'expired',
  'terminated',
  'withdrawn',
])

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

function parseStatusList(raw: string | undefined): ComprehensiveStatus[] {
  if (!raw) return [...COMPREHENSIVE_STATUSES]
  const requested = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const allowed = new Set<string>(COMPREHENSIVE_STATUSES)
  const filtered = requested.filter((s): s is ComprehensiveStatus => allowed.has(s))
  return filtered.length > 0 ? filtered : [...COMPREHENSIVE_STATUSES]
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const province = (q.province as string) || undefined
  const city = (q.city as string) || undefined
  const community = (q.community as string) || undefined
  const range = (q.range as string) || 'last_90'
  const startDate = q.startDate as string | undefined
  const endDate = q.endDate as string | undefined
  const limit = parseInt((q.limit as string) || '100')
  const page = parseInt((q.page as string) || '1')
  const skip = (page - 1) * limit
  const statuses = parseStatusList(q.statuses as string | undefined)

  // Comprehensive CMA universe. CMA must never compare against leases/rentals —
  // those are a different market with different price dynamics. Pillar9 and
  // the post-2026-06 CREA transformer correctly map LEASED → 'leased', but
  // legacy CREA rows that pre-date the fix may still be sitting in the DB
  // with `status='sold'`; isLeaseLikeProperty() catches those at query time
  // (see the .filter(...) call after the query below).
  const where: any = { status: { in: statuses } }
  if (province) {
    const provinceMap: Record<string, string> = {
      Alberta: 'AB',
      'British Columbia': 'BC',
      Saskatchewan: 'SK',
      Manitoba: 'MB',
      Ontario: 'ON'
    }
    const normalized = province.trim()
    const code = provinceMap[normalized] || Object.keys(provinceMap).find(key => provinceMap[key] === normalized) || undefined
    const provinceFilters = [{ province: { equals: normalized, mode: 'insensitive' } }]
    if (code && code !== normalized) {
      provinceFilters.push({ province: { equals: code, mode: 'insensitive' } })
    }
    where.AND = [...(where.AND || []), { OR: provinceFilters }]
  }
  if (city) {
    // Code/name/alias-aware matcher so CMA comps don't miss
    // Pillar9-coded rows or alias spellings.
    const cityConditions = buildCityWhereClause(city)
    if (cityConditions.length > 0) {
      where.AND = [...(where.AND || []), { OR: cityConditions }]
    }
  }
  if (community) where.cityRegion = { contains: community, mode: 'insensitive' }

  const dateFilter = parseDateRange(range, startDate, endDate)
  // We only narrow the *closed* statuses (sold/expired/terminated/withdrawn) by
  // date. for_sale and pending are current market state and shouldn't be hidden
  // just because their createdAt is outside the window — agents need to see
  // what's on market *now* regardless of date filter.
  const shouldFilterByDate = Boolean(dateFilter)

  // When date-filtering is on, we pull a generous superset and slice after the
  // in-memory resolution of effective dates (close date vs status-change vs
  // updatedAt). When date-filtering is off, we paginate at the DB.
  const fetchLimit = shouldFilterByDate ? 1000 : limit
  const fetchSkip = shouldFilterByDate ? 0 : skip

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: fetchLimit,
      skip: fetchSkip,
      select: {
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
        postalCode: true,
        latitude: true,
        longitude: true,
        images: true,
        features: true,
        description: true,
        updatedAt: true,
        createdAt: true,
        source: true,
        externalId: true,
        // True original/previous list prices straight from the MLS feed —
        // power the "listing-vs-sold" spread the user wants in the report.
        originalListPrice: true,
        previousListPrice: true,
        firstEntryPrice: true,
        priceChangeTimestamp: true,
      }
    })
  ])

  let backfillCount = 0
  const enriched = await Promise.all(properties.map(async (property: any) => {
    const features = typeof property.features === 'string' ? JSON.parse(property.features || '{}') : property.features || {}
    // For sold rows we lean on statusChangeTimestamp / closeDate; for other
    // closed statuses (expired/terminated/withdrawn) the same field holds
    // when the listing flipped off-market. Currently-listed (for_sale/pending)
    // rows use createdAt / updatedAt as their relevant timeline marker.
    let effectiveDate = features.closeDate || features.statusChangeTimestamp || null

    if (
      !effectiveDate &&
      property.status === 'sold' &&
      property.source === 'crea' &&
      property.externalId &&
      backfillCount < 50
    ) {
      try {
        backfillCount += 1
        const remote = await creaService.getPropertyById(property.externalId)
        const rawStatusDate = remote?.StatusChangeTimestamp
        const normalized = rawStatusDate ? rawStatusDate.replace(/^"+|"+$/g, '') : null
        if (normalized && !isNaN(new Date(normalized).getTime())) {
          effectiveDate = new Date(normalized).toISOString()
          features.statusChangeTimestamp = effectiveDate
          await prisma.property.update({
            where: { id: property.id },
            data: { features }
          })
        }
      } catch (error) {
        // Silently handle - property may not exist in CREA anymore
      }
    }

    // Fall back to updatedAt so the field is never empty in the UI table.
    const resolvedDate = effectiveDate || (property.updatedAt ? new Date(property.updatedAt).toISOString() : null)

    // Listing-price provenance: prefer the MLS-fed originalListPrice, then
    // previousListPrice, then our own firstEntryPrice snapshot.
    const listingPrice =
      property.originalListPrice ??
      property.previousListPrice ??
      property.firstEntryPrice ??
      null

    return {
      ...property,
      features,
      soldDate: resolvedDate, // kept named `soldDate` for back-compat with the existing UI table
      effectiveDate: resolvedDate,
      listingPrice,
    }
  }))

  // Defense-in-depth: drop any rows that look like leases/rentals even if
  // their `status` column says 'sold'. Catches legacy CREA rows synced before
  // crea.service.ts gained proper lease detection (2026-06).
  const saleOnly = enriched.filter((property: any) => !isLeaseLikeProperty(property))

  const filtered = shouldFilterByDate
    ? saleOnly.filter((property: any) => {
        // Currently-listed statuses ignore the date window entirely — agents
        // need them visible regardless of when they came on market.
        if (!CLOSED_STATUSES.has(property.status as ComprehensiveStatus)) return true
        if (!property.effectiveDate) return false
        const d = new Date(property.effectiveDate)
        if (isNaN(d.getTime())) return false
        return d >= (dateFilter as any).gte && d <= (dateFilter as any).lte
      })
    : saleOnly

  const paged = shouldFilterByDate ? filtered.slice(skip, skip + limit) : filtered
  // When date-filtering is on we paginate in-memory and the true count is the
  // post-filter length. When date-filtering is off we paginated via DB and our
  // in-memory lease filter can only shrink the page; the DB-side `total` is
  // therefore a slight overcount, but always within the lease-contamination
  // delta (which fades to zero as CREA rows are re-synced).
  const totalCount = shouldFilterByDate ? filtered.length : total

  // Breakdown by status so the UI can show a small "5 sold · 3 active · …"
  // summary above the table without re-running queries per status.
  const statusBreakdown: Record<string, number> = {}
  for (const s of statuses) statusBreakdown[s] = 0
  for (const p of filtered) {
    const s = p.status as string
    if (statusBreakdown[s] != null) statusBreakdown[s] += 1
  }

  return {
    properties: paged,
    statuses,
    statusBreakdown,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
  }
})

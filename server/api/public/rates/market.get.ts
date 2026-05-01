import { defineEventHandler, createError } from 'h3'
import { VALET_SERIES, VALET_SERIES_BY_ID, type ValetSeriesDef } from '../../../utils/valetSeries'

/**
 * GET /api/public/rates/market
 * ────────────────────────────
 * Server-side proxy for the Bank of Canada Valet API. Fetches the latest 6
 * months of every series defined in `valetSeries.ts`, reshapes the response
 * into something the public /rates page can render directly (per-category
 * groups + sparkline data), and caches the result in-process.
 *
 * Why proxy instead of calling Valet from the browser?
 *   • One round-trip from the user (~50KB) instead of 28 separate cross-origin
 *     hits + CORS preflights.
 *   • In-process cache means a high-traffic public page hammers our server,
 *     not Valet's.
 *   • Source of truth for series IDs lives server-side, so the public page
 *     stays declarative.
 *
 * Valet only refreshes monthly so a 6-hour TTL is generous; we still expose a
 * `?fresh=1` escape hatch for the admin if they need to bust cache manually.
 */

const VALET_BASE = 'https://www.bankofcanada.ca/valet'
const RECENT_MONTHS = 6
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const FETCH_TIMEOUT_MS = 8000

interface ValetObservation {
  d: string                                   // ISO date "YYYY-MM-DD"
  [seriesId: string]: { v: string } | string  // each series has { v: "4.31" }
}

interface ValetResponse {
  observations?: ValetObservation[]
  seriesDetail?: Record<string, { label?: string; description?: string }>
}

export interface MarketRatePoint {
  date: string   // ISO YYYY-MM-DD
  value: number  // percent
}

export interface MarketRate {
  id: string
  label: string
  category: ValetSeriesDef['category']
  group: string
  highlight: boolean
  current: number | null    // most recent observation
  previous: number | null   // observation immediately before
  delta: number | null      // current - previous (in percentage points)
  asOf: string | null       // ISO date of most recent observation
  history: MarketRatePoint[] // newest-first → oldest-last for sparkline rendering
}

export interface MarketRatesResponse {
  source: 'Bank of Canada — Valet API'
  fetchedAt: string
  asOf: string | null
  cached: boolean
  rates: MarketRate[]
}

// ── In-process cache (per Nitro instance) ──────────────────────────────────
let cache: { value: MarketRatesResponse; expiresAt: number } | null = null

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function reshape(raw: ValetResponse): MarketRatesResponse {
  const obs = (raw.observations || []).slice().sort((a, b) => a.d.localeCompare(b.d))
  const rates: MarketRate[] = []

  for (const def of VALET_SERIES) {
    const points: MarketRatePoint[] = []
    for (const o of obs) {
      const cell = o[def.id]
      if (cell && typeof cell === 'object' && 'v' in cell && cell.v != null && cell.v !== '') {
        const n = Number(cell.v)
        if (Number.isFinite(n)) points.push({ date: o.d, value: n })
      }
    }
    const last = points[points.length - 1] ?? null
    const prev = points[points.length - 2] ?? null
    rates.push({
      id: def.id,
      label: def.label,
      category: def.category,
      group: def.group,
      highlight: !!def.highlight,
      current: last?.value ?? null,
      previous: prev?.value ?? null,
      delta: last && prev ? +(last.value - prev.value).toFixed(2) : null,
      asOf: last?.date ?? null,
      // Newest first is friendlier for the UI — sparklines reverse it once.
      history: points.slice().reverse(),
    })
  }

  // Newest observation across all series — the "as of" stamp the page shows.
  const overallAsOf = rates
    .map(r => r.asOf)
    .filter((d): d is string => !!d)
    .sort()
    .pop() ?? null

  return {
    source: 'Bank of Canada — Valet API',
    fetchedAt: new Date().toISOString(),
    asOf: overallAsOf,
    cached: false,
    rates,
  }
}

export default defineEventHandler(async (event) => {
  const fresh = (getQuery(event).fresh as string | undefined) === '1'

  if (!fresh && cache && cache.expiresAt > Date.now()) {
    return { ...cache.value, cached: true }
  }

  const ids = VALET_SERIES.map(s => s.id).join(',')
  const url = `${VALET_BASE}/observations/${ids}/json?recent=${RECENT_MONTHS}`

  let raw: ValetResponse
  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    if (!res.ok) {
      throw new Error(`Valet returned ${res.status} ${res.statusText}`)
    }
    raw = await res.json() as ValetResponse
  } catch (err: any) {
    // If we have a stale cache, serve it rather than failing the user-facing
    // page when Valet is briefly unreachable.
    if (cache) {
      console.warn('[market-rates] Valet fetch failed, serving stale cache:', err?.message || err)
      return { ...cache.value, cached: true }
    }
    console.error('[market-rates] Valet fetch failed and no cache available:', err?.message || err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not reach the Bank of Canada rate service. Please try again shortly.',
    })
  }

  const reshaped = reshape(raw)
  cache = { value: reshaped, expiresAt: Date.now() + CACHE_TTL_MS }

  // Touch VALET_SERIES_BY_ID so the import is preserved by tree-shakers and
  // future maintainers can easily look up extra metadata if needed.
  void VALET_SERIES_BY_ID

  return reshaped
})

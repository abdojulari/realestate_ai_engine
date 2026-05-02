/**
 * Per-tenant absolute site URL resolution for SERVER code (emails, ICS,
 * cron, outbound notifications).
 *
 * Why this exists
 * ───────────────
 * The shared Nuxt build serves every tenant subdomain. We can no longer rely
 * on `config.public.siteUrl` to build absolute links in outbound emails — it
 * is intentionally blank in multi-tenant deployments. Instead we resolve the
 * canonical URL per tenant from `TenantSettings.customDomain` /
 * `TenantSettings.subdomain`, with a request-scoped fast path and a cached
 * lookup layer to keep this off the email hot path.
 *
 * Resolution (per call)
 *   1. The current request's `Host` header (when available) — fastest, no DB.
 *      Used by request handlers like /api/properties/inquiry where the
 *      visitor IS on the tenant's site.
 *   2. `tenantSettings.customDomain` (e.g. "acmesrealty.com") → "https://…"
 *   3. `tenantSettings.subdomain` + APP_BASE_DOMAIN → "https://acme.deelbot.ai"
 *   4. process.env.NUXT_PUBLIC_SITE_URL  (single-tenant fallback)
 *   5. process.env.APP_URL / SITE_URL    (legacy)
 *   6. "http://localhost:3000"           (dev last-resort)
 *
 * The DB lookup is cached for TENANT_URL_TTL_MS (default 5 min) per adminId.
 */

import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const TENANT_URL_TTL_MS = 5 * 60_000

interface CachedUrl {
  url: string | null
  expiresAt: number
}

const cache = new Map<number, CachedUrl>()

function trimSlash(s: string): string {
  return s.replace(/\/$/, '')
}

function envFallback(): string {
  return trimSlash(
    process.env.NUXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      process.env.SITE_URL ||
      'http://localhost:3000'
  )
}

/**
 * Build an https URL from a host. Localhost / private LANs default to http.
 */
function urlFromHost(host: string): string {
  const h = host.trim().toLowerCase().replace(/:.*$/, '')
  const isLocal =
    h === 'localhost' ||
    h.startsWith('127.') ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.endsWith('.local')
  const proto = isLocal ? 'http' : 'https'
  return `${proto}://${host}`
}

/**
 * Derive the absolute origin from the incoming request's `Host` (+
 * `x-forwarded-proto`) header. Returns "" if not callable from a request.
 */
export function getRequestSiteUrl(event: H3Event | null | undefined): string {
  if (!event) return ''
  try {
    const host = getRequestHeader(event, 'host') || ''
    if (!host) return ''
    const xfProto = getRequestHeader(event, 'x-forwarded-proto') || ''
    const proto = xfProto.split(',')[0]?.trim()
    if (proto) return trimSlash(`${proto}://${host}`)
    return trimSlash(urlFromHost(host))
  } catch {
    return ''
  }
}

/**
 * Look up the canonical absolute URL for a tenant by their admin id.
 * Cached. Returns "" if no TenantSettings row exists and no env fallback
 * makes sense.
 */
export async function getTenantSiteUrl(adminId: number | null | undefined): Promise<string> {
  if (!adminId) return envFallback()

  const cached = cache.get(adminId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url || envFallback()
  }

  let url: string | null = null
  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { adminId },
      select: { subdomain: true, customDomain: true },
    })
    if (settings) {
      const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase()
      if (settings.customDomain) {
        url = trimSlash(urlFromHost(settings.customDomain))
      } else if (settings.subdomain && baseDomain) {
        url = trimSlash(urlFromHost(`${settings.subdomain}.${baseDomain}`))
      }
    }
  } catch (err) {
    console.error('[tenantSiteUrl] lookup failed for adminId', adminId, err)
  }

  cache.set(adminId, { url, expiresAt: Date.now() + TENANT_URL_TTL_MS })
  return url || envFallback()
}

/**
 * Best-of-both helper: prefer the live request `Host` if we have an event
 * (cheap + always correct for the tenant the visitor is on), fall back to
 * the per-tenant DB lookup, then env. Use this in request handlers that
 * already have an `event` AND know the `adminId` (e.g. inquiry / viewing
 * request emails to the realtor).
 */
export async function getTenantSiteUrlForEvent(
  event: H3Event | null | undefined,
  adminId: number | null | undefined,
): Promise<string> {
  const fromEvent = getRequestSiteUrl(event)
  if (fromEvent) return fromEvent
  return getTenantSiteUrl(adminId)
}

/**
 * Internal-fetch base URL for server-to-server calls (e.g. the alert
 * scheduler that calls /api/alerts/run-due on itself, or the alert runner
 * fetching /api/properties). These never leave the box, so we use loopback
 * to avoid round-tripping through the public proxy / TLS / tenant routing.
 */
export function getInternalApiBase(): string {
  if (process.env.INTERNAL_API_BASE) return trimSlash(process.env.INTERNAL_API_BASE)
  const port = process.env.NITRO_PORT || process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}

/**
 * Test-only: clear the in-memory cache. Avoid in production code.
 */
export function _clearTenantSiteUrlCache(): void {
  cache.clear()
}

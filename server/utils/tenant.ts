/**
 * Tenant Isolation Utilities
 * ──────────────────────────
 * Provides helpers so every API route can enforce strict data isolation.
 *
 * Rules:
 *  • super_admin → IS a tenant (adminId = user.id), same as admin for data scoping.
 *                   Can still access other tenants' individual records for support
 *                   via requireTenantAccess (which is permissive for super_admin).
 *  • admin       → IS a tenant; adminId = user.id
 *  • user        → belongs to an admin; adminId = user.adminId
 */

import { H3Event, createError, getHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


// ── Types ───────────────────────────────────────────────────

export interface TenantUser {
  id: number
  role: string
  adminId?: number | null
}

// ── Core helpers ────────────────────────────────────────────

/**
 * Return the tenant admin ID for the given user.
 *  • super_admin → user.id  (they ARE a tenant, same as admin)
 *  • admin       → user.id  (they ARE the tenant)
 *  • user        → user.adminId
 */
export function getTenantAdminId(user: TenantUser): number | null {
  if (user.role === 'super_admin') return user.id
  if (user.role === 'admin') return user.id
  return user.adminId ?? null
}

/**
 * Return a Prisma WHERE fragment that scopes queries to the tenant.
 * Both super_admin and admin are scoped to their own data.
 */
export function getTenantFilter(user: TenantUser): { adminId?: number } {
  const id = getTenantAdminId(user)
  if (id === null) return {}
  return { adminId: id }
}

/**
 * Same as getTenantFilter but for models where the column is `userId`
 * and the admin's own records are identified by user.id.
 */
export function getUserTenantFilter(user: TenantUser): { userId?: number } {
  return { userId: user.id }
}

/**
 * Return the adminId to assign when CREATING a new tenant-scoped record.
 * super_admin creates under their own ID so the record still belongs to a tenant.
 */
export function getAdminIdForCreate(user: TenantUser): number {
  if (user.role === 'super_admin' || user.role === 'admin') return user.id
  return user.adminId ?? user.id
}

/**
 * Verify that the authenticated user has access to a specific record's tenant.
 * Throws 403 if not.
 */
export function requireTenantAccess(user: TenantUser, recordAdminId: number | null | undefined): void {
  if (user.role === 'super_admin') return
  const tenantId = getTenantAdminId(user)
  if (!tenantId || tenantId !== recordAdminId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: record belongs to another tenant' })
  }
}

/**
 * Strict tenant boundary for features where even super_admin must only see their own tenant's rows
 * (same isolation model as admin brokers).
 */
export function requireSameTenantOnly(user: TenantUser, recordAdminId: number | null | undefined): void {
  const tenantId = getTenantAdminId(user)
  if (!tenantId || recordAdminId == null || tenantId !== recordAdminId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: record belongs to another tenant' })
  }
}

// ── Public-facing route helpers (domain-based resolution) ───

// Cache the fallback admin ID so we don't query every request
let _fallbackAdminId: number | null | undefined

/**
 * Normalize an incoming Host header for tenant resolution:
 *  - lower-cases
 *  - strips port (`:3000`)
 *  - strips a leading `www.` so `www.tonahomes.com` and `tonahomes.com`
 *    resolve to the same tenant. This is critical: tenants typically
 *    save their bare apex domain in `tenantSettings.customDomain` but
 *    end users land on `www.` first, which previously fell through to
 *    the dev fallback admin and made their published blog posts 404.
 */
function normalizeHost(rawHost: string | undefined | null): string {
  let host = (rawHost || '').replace(/:.*$/, '').trim().toLowerCase()
  if (host.startsWith('www.')) host = host.slice(4)
  return host
}

/**
 * Resolve the tenant admin ID from a raw host string (no event scope).
 *
 * Used by flows where the request Host is NOT the tenant — most notably
 * the canonical-mode Google OAuth callback, which always lands on the
 * canonical host (deelbot.ai) but knows the originating tenant origin
 * from the signed `state` payload. Calling resolveTenantFromRequest
 * there would resolve the canonical apex (no tenant), so we extract
 * just the host portion of the tenantOrigin URL and look that up.
 *
 * Returns null when the host doesn't match any tenant — caller decides
 * how to handle (skip adminId assignment, error, etc.). NEVER falls
 * back to "first admin in DB" — that quirk only applies to public
 * read paths, not user creation, where attaching an end user to the
 * wrong tenant is much worse than leaving them as null.
 */
export async function resolveTenantAdminIdFromHost(rawHost: string | null | undefined): Promise<number | null> {
  const host = normalizeHost(rawHost)
  if (!host) return null
  const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase()

  // Subdomain pattern: tonahomes.deelbot.ai → "tonahomes"
  if (baseDomain && host !== baseDomain && host.endsWith('.' + baseDomain)) {
    const subdomain = host.slice(0, -baseDomain.length - 1)
    if (subdomain) {
      const settings = await prisma.tenantSettings.findFirst({
        where: { subdomain },
        select: { adminId: true },
      })
      if (settings) return settings.adminId
    }
    return null
  }

  // Custom domain (try bare apex AND www. variant — operators commonly
  // save just one form in TenantSettings.customDomain).
  if (host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('192.168.')) {
    const settings = await prisma.tenantSettings.findFirst({
      where: {
        OR: [
          { customDomain: host },
          { customDomain: `www.${host}` },
        ],
      },
      select: { adminId: true },
    })
    if (settings) return settings.adminId
  }

  return null
}

/**
 * Resolve tenant admin ID from Host / X-Tenant-Domain only — **no** dev fallback.
 * Use for writes (e.g. testimonial POST) where assigning the wrong tenant is unacceptable.
 *
 * Order: X-Tenant-Domain → Host subdomain → custom domain (bare + www.).
 */
export async function resolveTenantAdminIdFromDomainRequest(event: H3Event): Promise<number | null> {
  // 1. Explicit header
  const tenantHeader = getHeader(event, 'x-tenant-domain')
  if (tenantHeader) {
    const normHeader = normalizeHost(tenantHeader)
    const settings = await prisma.tenantSettings.findFirst({
      where: {
        OR: [
          { subdomain: normHeader },
          { customDomain: normHeader },
          { customDomain: `www.${normHeader}` },
        ],
      },
      select: { adminId: true },
    })
    if (settings) return settings.adminId
  }

  // 2. Subdomain
  const rawHost = getHeader(event, 'host') || ''
  const host = normalizeHost(rawHost)
  const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase()

  if (baseDomain && host !== baseDomain && host.endsWith('.' + baseDomain)) {
    const subdomain = host.slice(0, -baseDomain.length - 1)
    if (subdomain) {
      const settings = await prisma.tenantSettings.findFirst({
        where: { subdomain },
        select: { adminId: true },
      })
      if (settings) return settings.adminId
    }
  }

  // 3. Custom domain – try both the bare apex and the www. variant so
  //    operators don't have to enter both rows in tenantSettings.
  if (host && host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('192.168.')) {
    const settings = await prisma.tenantSettings.findFirst({
      where: {
        OR: [
          { customDomain: host },
          { customDomain: `www.${host}` },
        ],
      },
      select: { adminId: true },
    })
    if (settings) return settings.adminId
  }

  return null
}

async function getCachedDevFallbackTenantAdminId(): Promise<number | null> {
  if (_fallbackAdminId !== undefined) return _fallbackAdminId

  const fallback = await prisma.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] } },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  _fallbackAdminId = fallback?.id ?? null
  return _fallbackAdminId
}

/**
 * Resolve the tenant admin ID from the incoming request domain.
 * Used by PUBLIC routes (no auth required).
 *
 * Resolution order:
 *  1. {@link resolveTenantAdminIdFromDomainRequest}
 *  2. Fallback: first admin/super_admin (for development only — avoids empty homepage on localhost)
 */
export async function resolveTenantFromRequest(event: H3Event): Promise<number | null> {
  const fromDomain = await resolveTenantAdminIdFromDomainRequest(event)
  if (fromDomain != null) return fromDomain

  return getCachedDevFallbackTenantAdminId()
}

/**
 * Strict tenant resolution for anonymous public submits where attributing the
 * record to the wrong tenant is unacceptable (testimonials, newsletter signups,
 * contact forms, etc.).
 *
 * Resolution order:
 *   1. Host / X-Tenant-Domain header
 *   2. Referer hostname (SPA / proxy cases where Host doesn't match the brand site)
 *   3. Origin hostname (CORS XHR cases)
 *   4. NON-PRODUCTION ONLY: first admin in DB (so localhost dev still works)
 *
 * Returns the tenant adminId, or null if resolution failed. Callers should
 * reject the submit (typically 400) on null so we never silently misattribute.
 */
export async function resolveAnonymousSubmitTenantAdminId(
  event: H3Event
): Promise<number | null> {
  let adminId = await resolveTenantAdminIdFromDomainRequest(event)

  if (adminId == null) {
    const referer = getHeader(event, 'referer')
    if (referer) {
      try {
        adminId = await resolveTenantAdminIdFromHost(new URL(referer).hostname)
      } catch {
        /* malformed Referer */
      }
    }
  }

  if (adminId == null) {
    const origin = getHeader(event, 'origin')
    if (origin) {
      try {
        adminId = await resolveTenantAdminIdFromHost(new URL(origin).hostname)
      } catch {
        /* malformed Origin */
      }
    }
  }

  if (adminId == null && process.env.NODE_ENV !== 'production') {
    adminId = await getCachedDevFallbackTenantAdminId()
  }

  return adminId
}

/**
 * Tenant admin ID for anonymous testimonial POST. Throws 400 if attribution fails.
 */
export async function resolveTenantAdminIdForTestimonialSubmit(event: H3Event): Promise<number> {
  const adminId = await resolveAnonymousSubmitTenantAdminId(event)
  if (adminId == null) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Could not determine which brokerage this testimonial belongs to. Please submit the form from your agent website.',
    })
  }
  return adminId
}

/**
 * Convenience: get a Prisma WHERE fragment for a public route.
 * Returns { adminId: X } based on domain resolution.
 */
export async function getPublicTenantFilter(event: H3Event): Promise<{ adminId?: number }> {
  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) return {}
  return { adminId }
}

/** CREA + Pillar9 MLS are shared platform-wide; manual listings stay per-tenant (adminId). */
export const SHARED_MLS_SOURCES = ['crea', 'pillar9'] as const

export function isSharedMlsSource(source: string | null | undefined): boolean {
  return source === 'crea' || source === 'pillar9'
}

/**
 * Public property catalog: all tenants see the same CREA/Pillar9 rows; only `manual` is scoped to this tenant.
 */
export function getPublicSharedMlsWhere(tenantFilter: { adminId?: number }): {
  OR: Array<Record<string, unknown>>
} {
  const adminId = tenantFilter.adminId
  if (adminId != null) {
    return {
      OR: [
        { source: { in: [...SHARED_MLS_SOURCES] } },
        { source: 'manual' as const, adminId },
      ],
    }
  }
  return {
    OR: [{ source: { in: [...SHARED_MLS_SOURCES] } }],
  }
}

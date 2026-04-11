/**
 * Tenant Isolation Utilities
 * ──────────────────────────
 * Provides helpers so every API route can enforce strict data isolation.
 *
 * Rules:
 *  • super_admin → sees ALL tenants (no filter applied)
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
 *  • super_admin → null  (no restriction)
 *  • admin       → user.id  (they ARE the tenant)
 *  • user        → user.adminId
 */
export function getTenantAdminId(user: TenantUser): number | null {
  if (user.role === 'super_admin') return null
  if (user.role === 'admin') return user.id
  return user.adminId ?? null
}

/**
 * Return a Prisma WHERE fragment that scopes queries to the tenant.
 * For super_admin it returns an empty object (no filter).
 */
export function getTenantFilter(user: TenantUser): { adminId?: number } {
  const id = getTenantAdminId(user)
  if (id === null) return {} // super_admin sees all
  return { adminId: id }
}

/**
 * Same as getTenantFilter but for models where the column is `userId`
 * and the admin's own records are identified by user.id.
 * For super_admin returns empty object.
 */
export function getUserTenantFilter(user: TenantUser): { userId?: number } {
  if (user.role === 'super_admin') return {}
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

// ── Public-facing route helpers (domain-based resolution) ───

// Cache the fallback admin ID so we don't query every request
let _fallbackAdminId: number | null | undefined

/**
 * Resolve the tenant admin ID from the incoming request domain.
 * Used by PUBLIC routes (no auth required).
 *
 * Resolution order:
 *  1. X-Tenant-Domain header
 *  2. Host subdomain   (acme.realestatehub.ca → "acme")
 *  3. Custom domain     (acmesrealty.com)
 *  4. Fallback: first admin/super_admin (for development)
 */
export async function resolveTenantFromRequest(event: H3Event): Promise<number | null> {
  // 1. Explicit header
  const tenantHeader = getHeader(event, 'x-tenant-domain')
  if (tenantHeader) {
    const settings = await prisma.tenantSettings.findFirst({
      where: { OR: [{ subdomain: tenantHeader }, { customDomain: tenantHeader }] },
      select: { adminId: true },
    })
    if (settings) return settings.adminId
  }

  // 2. Subdomain
  const host = (getHeader(event, 'host') || '').replace(/:.*$/, '').toLowerCase()
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

  // 3. Custom domain
  if (host && host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('192.168.')) {
    const settings = await prisma.tenantSettings.findFirst({
      where: { customDomain: host },
      select: { adminId: true },
    })
    if (settings) return settings.adminId
  }

  // 4. Fallback for development – first admin / super_admin
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

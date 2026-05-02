/**
 * Maps /api/admin/* routes to feature keys and HTTP verbs to permission actions.
 * Delegated users (role user + delegatedAdminPermissions) must pass these checks inside requireAdmin().
 */

import { createError, getMethod, getRequestURL, type H3Event } from 'h3'

export type DelegatedAction = 'read' | 'write' | 'edit' | 'delete'

export type FeaturePermission = Partial<Record<DelegatedAction, boolean>>

export type DelegatedPermissionsMap = Record<string, FeaturePermission>

/** Canonical feature keys (use in DB + UI). */
export const DELEGATABLE_FEATURE_KEYS = [
  'core',
  'site_management',
  'crm',
  'properties',
  'listing_templates',
  'best_deals',
  'off_market',
  'calendar',
  'facebook',
  'blog',
  'cma',
  'crea_sync',
  'pillar9_sync',
  'newsletter',
  'lead_generation',
  'insta_connect',
  'workspace_tools',
  'content',
  'resources',
  'documents',
  'reports',
  'bookkeeping',
  'settings',
  'tenant_settings',
  'testimonials',
  'bookings',
  'estimates',
  'signatures',
  'activity_log',
  'ml',
  'user_management',
] as const

export type DelegatableFeatureKey = (typeof DELEGATABLE_FEATURE_KEYS)[number]

const DELEGATABLE_SET = new Set<string>(DELEGATABLE_FEATURE_KEYS)

export function isDelegatableFeatureKey(k: string): k is DelegatableFeatureKey {
  return DELEGATABLE_SET.has(k)
}

export function methodToDelegatedAction(method: string): DelegatedAction {
  const m = (method || 'GET').toUpperCase()
  if (m === 'GET' || m === 'HEAD') return 'read'
  if (m === 'POST') return 'write'
  if (m === 'PUT' || m === 'PATCH') return 'edit'
  if (m === 'DELETE') return 'delete'
  return 'read'
}

function kebabSegmentToFeature(segment: string): string | null {
  const map: Record<string, string> = {
    dashboard: 'core',
    notifications: 'core',
    profile: 'core',
    'activity-logs': 'activity_log',
    blog: 'blog',
    bookkeeping: 'bookkeeping',
    bookings: 'bookings',
    calendar: 'calendar',
    contacts: 'crm',
    content: 'content',
    crea: 'crea_sync',
    crm: 'crm',
    cma: 'cma',
    documents: 'documents',
    estimates: 'estimates',
    facebook: 'facebook',
    'lead-generation': 'lead_generation',
    'insta-connect': 'insta_connect',
    'listing-templates': 'listing_templates',
    newsletter: 'newsletter',
    'off-market': 'off_market',
    pillar9: 'pillar9_sync',
    // Posted bank rates ride on the same delegate gate as other public-site
    // content (blog / flash-news / resources). Mirrors the sidebar wiring
    // in app/layouts/admin.vue (`delegateFeature: 'content'`).
    'posted-rates': 'content',
    'price-cuts': 'best_deals',
    properties: 'properties',
    reports: 'reports',
    resources: 'resources',
    settings: 'settings',
    signatures: 'signatures',
    testimonials: 'testimonials',
    'tenant-settings': 'tenant_settings',
    'workspace-tools': 'workspace_tools',
    help: 'core',
    ml: 'ml',
    users: 'user_management',
  }
  return map[segment] ?? null
}

/**
 * Longest-prefix wins (more specific than segment fallback).
 */
const PREFIX_RULES: { prefix: string; feature: string }[] = [
  { prefix: '/api/admin/notifications/settings', feature: 'settings' },
  { prefix: '/api/admin/settings/home-template', feature: 'site_management' },
  { prefix: '/api/admin/settings', feature: 'settings' },
  { prefix: '/api/admin/tenant-settings', feature: 'tenant_settings' },
  { prefix: '/api/admin/content', feature: 'content' },
].sort((a, b) => b.prefix.length - a.prefix.length)

/** Delegation configuration is always owner-only; assistants use user_management for /api/admin/users. */
const DELEGATE_BLOCKED_PREFIXES = ['/api/admin/delegation']

export function resolveAdminRouteAccess(pathname: string): {
  blockedForDelegate: boolean
  feature: string | null
} {
  const path = pathname.split('?')[0] || ''

  for (const p of DELEGATE_BLOCKED_PREFIXES) {
    if (path === p || path.startsWith(p + '/')) {
      return { blockedForDelegate: true, feature: null }
    }
  }

  for (const rule of PREFIX_RULES) {
    if (path === rule.prefix || path.startsWith(rule.prefix + '/')) {
      return { blockedForDelegate: false, feature: rule.feature }
    }
  }

  const m = path.match(/^\/api\/admin\/([^/?#]+)/)
  if (!m?.[1]) {
    return { blockedForDelegate: false, feature: null }
  }

  const feature = kebabSegmentToFeature(m[1])
  return { blockedForDelegate: false, feature }
}

export function parseDelegatedPermissions(raw: unknown): DelegatedPermissionsMap | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const out: DelegatedPermissionsMap = {}
  let any = false
  for (const [key, val] of Object.entries(obj)) {
    if (!isDelegatableFeatureKey(key)) continue
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue
    const p = val as Record<string, unknown>
    const fp: FeaturePermission = {
      read: Boolean(p.read),
      write: Boolean(p.write),
      edit: Boolean(p.edit),
      delete: Boolean(p.delete),
    }
    if (fp.read || fp.write || fp.edit || fp.delete) {
      out[key] = fp
      any = true
    }
  }
  return any ? out : null
}

export function hasDelegatedAdminAccess(perms: DelegatedPermissionsMap | null): boolean {
  return perms != null && Object.keys(perms).length > 0
}

function isActionGranted(fp: FeaturePermission | undefined, action: DelegatedAction): boolean {
  if (!fp) return false
  if (action === 'read') return Boolean(fp.read || fp.write || fp.edit || fp.delete)
  if (action === 'write') return Boolean(fp.write || fp.edit || fp.delete)
  if (action === 'edit') return Boolean(fp.edit || fp.delete)
  if (action === 'delete') return Boolean(fp.delete)
  return false
}

/**
 * Resolves feature for delegated users: /api/admin/* plus mutating /api/content/* (admin CMS router).
 */
export function resolveDelegateRequestFeature(event: H3Event): {
  blockedForDelegate: boolean
  feature: string | null
} {
  const url = getRequestURL(event)
  const pathname = url.pathname
  const method = getMethod(event).toUpperCase()

  if (pathname.startsWith('/api/content') && method !== 'GET' && method !== 'HEAD') {
    return { blockedForDelegate: false, feature: 'content' }
  }

  if (pathname.startsWith('/api/ml/')) {
    return { blockedForDelegate: false, feature: 'ml' }
  }

  if (!pathname.startsWith('/api/admin/')) {
    return { blockedForDelegate: false, feature: null }
  }

  return resolveAdminRouteAccess(pathname)
}

export function assertDelegatedRouteAccess(event: H3Event, perms: DelegatedPermissionsMap): void {
  const { blockedForDelegate, feature } = resolveDelegateRequestFeature(event)

  if (blockedForDelegate) {
    throw createError({ statusCode: 403, statusMessage: 'This area is restricted to account owners' })
  }

  if (!feature || !isDelegatableFeatureKey(feature)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin action not permitted for delegated access' })
  }

  const action = methodToDelegatedAction(getMethod(event))
  if (!isActionGranted(perms[feature], action)) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions for this action' })
  }
}

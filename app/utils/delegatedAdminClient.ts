/**
 * Client-side checks for delegated admin panel access (mirrors server parseDelegatedPermissions loosely).
 */

export function userHasDelegatedAdminAccess(user: {
  role?: string | null
  adminId?: number | null
  delegatedAdminPermissions?: unknown
} | null): boolean {
  if (!user || user.role !== 'user' || user.adminId == null) return false
  const raw = user.delegatedAdminPermissions
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  for (const v of Object.values(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      if (o.read || o.write || o.edit || o.delete) return true
    }
  }
  return false
}

export function delegateFeatureAllowsRead(
  user: { delegatedAdminPermissions?: unknown } | null,
  featureKey: string
): boolean {
  if (!user?.delegatedAdminPermissions || typeof user.delegatedAdminPermissions !== 'object') return false
  const raw = (user.delegatedAdminPermissions as Record<string, unknown>)[featureKey]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const o = raw as Record<string, unknown>
  return Boolean(o.read || o.write || o.edit || o.delete)
}

/** Labels for profile permission matrix (keys must match server DELEGATABLE_FEATURE_KEYS). */
export const DELEGATION_FEATURE_LABELS: Record<string, string> = {
  core: 'Essentials (dashboard, profile, notifications, help)',
  site_management: 'Site Management (home template)',
  crm: 'CRM',
  properties: 'Properties',
  listing_templates: 'Listing templates',
  best_deals: 'Best deals / price cuts',
  off_market: 'Off-market',
  calendar: 'Calendar',
  facebook: 'Facebook',
  blog: 'Blog',
  cma: 'CMA',
  crea_sync: 'CREA sync',
  pillar9_sync: 'Pillar9 sync',
  newsletter: 'Newsletter',
  lead_generation: 'Lead generation',
  insta_connect: 'InstaConnect (digital business card)',
  workspace_tools: 'Workspace tools',
  content: 'Content blocks',
  resources: 'Resources',
  documents: 'Documents',
  reports: 'Reports',
  bookkeeping: 'Bookkeeping',
  settings: 'Settings',
  tenant_settings: 'Branding & tenant settings',
  testimonials: 'Testimonials',
  bookings: 'Bookings',
  estimates: 'Estimates',
  signatures: 'Signatures',
  activity_log: 'Activity log',
  ml: 'ML / analytics',
  user_management: 'User management (team accounts)',
}

export const DELEGATION_FEATURE_ORDER = Object.keys(DELEGATION_FEATURE_LABELS)

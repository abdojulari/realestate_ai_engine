// License Service - Feature Access Control by Tier
// Based on Admin's subscription tier - users inherit from their admin

import { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Feature definitions
export const FEATURES = {
  // CMA (Comparative Market Analysis)
  CMA: 'cma',
  CMA_REPORT: 'cma_report',
  
  // AI Features
  CHATBOT: 'chatbot',
  AI_SEARCH: 'ai_search',
  AI_DESCRIPTION: 'ai_description',
  AI_INSIGHTS: 'ai_insights',
  
  // ML/Forecast
  FORECAST: 'forecast',
  ML_ANALYTICS: 'ml_analytics',
  ML_TRAINING: 'ml_training',
  
  // Newsletter
  NEWSLETTER: 'newsletter',
  NEWSLETTER_AUTOMATION: 'newsletter_automation',
  
  // Advanced
  CREA_SYNC: 'crea_sync',
  PILLAR9_SYNC: 'pillar9_sync',
  /** Document legal review (contract/purchase agreement analysis + date alerts) */
  DOCUMENTS_LEGAL_REVIEW: 'documents_legal_review',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

// License tiers
export type LicenseTier = 'free' | 'basic' | 'silver' | 'gold' | 'platinum' | 'enterprise'

// Feature access by tier
// Basic: No AI at all
// Silver: CMA only
// Gold: CMA + Chatbot
// Platinum/Enterprise: Full access (same as admin)
const TIER_FEATURES: Record<LicenseTier, Feature[]> = {
  free: [],
  
  basic: [
    // No AI features
    // Basic newsletter only
    FEATURES.NEWSLETTER,
    FEATURES.CREA_SYNC,
    FEATURES.PILLAR9_SYNC,
  ],
  
  silver: [
    FEATURES.CMA,
    FEATURES.CMA_REPORT,
    FEATURES.NEWSLETTER,
    FEATURES.NEWSLETTER_AUTOMATION,
    FEATURES.CREA_SYNC,
    FEATURES.PILLAR9_SYNC,
    FEATURES.DOCUMENTS_LEGAL_REVIEW,
  ],
  
  gold: [
    FEATURES.CMA,
    FEATURES.CMA_REPORT,
    FEATURES.CHATBOT,
    FEATURES.AI_DESCRIPTION,
    FEATURES.NEWSLETTER,
    FEATURES.NEWSLETTER_AUTOMATION,
    FEATURES.CREA_SYNC,
    FEATURES.PILLAR9_SYNC,
    FEATURES.DOCUMENTS_LEGAL_REVIEW,
  ],
  
  platinum: [
    FEATURES.CMA,
    FEATURES.CMA_REPORT,
    FEATURES.CHATBOT,
    FEATURES.AI_SEARCH,
    FEATURES.AI_DESCRIPTION,
    FEATURES.AI_INSIGHTS,
    FEATURES.FORECAST,
    FEATURES.ML_ANALYTICS,
    FEATURES.ML_TRAINING,
    FEATURES.NEWSLETTER,
    FEATURES.NEWSLETTER_AUTOMATION,
    FEATURES.CREA_SYNC,
    FEATURES.PILLAR9_SYNC,
    FEATURES.DOCUMENTS_LEGAL_REVIEW,
  ],
  
  enterprise: [
    FEATURES.CMA,
    FEATURES.CMA_REPORT,
    FEATURES.CHATBOT,
    FEATURES.AI_SEARCH,
    FEATURES.AI_DESCRIPTION,
    FEATURES.AI_INSIGHTS,
    FEATURES.FORECAST,
    FEATURES.ML_ANALYTICS,
    FEATURES.ML_TRAINING,
    FEATURES.NEWSLETTER,
    FEATURES.NEWSLETTER_AUTOMATION,
    FEATURES.CREA_SYNC,
    FEATURES.PILLAR9_SYNC,
    FEATURES.DOCUMENTS_LEGAL_REVIEW,
  ],
}

// All features (for super admin)
const ALL_FEATURES: Feature[] = [
  FEATURES.CMA,
  FEATURES.CMA_REPORT,
  FEATURES.CHATBOT,
  FEATURES.AI_SEARCH,
  FEATURES.AI_DESCRIPTION,
  FEATURES.AI_INSIGHTS,
  FEATURES.FORECAST,
  FEATURES.ML_ANALYTICS,
  FEATURES.ML_TRAINING,
  FEATURES.NEWSLETTER,
  FEATURES.NEWSLETTER_AUTOMATION,
  FEATURES.CREA_SYNC,
  FEATURES.PILLAR9_SYNC,
  FEATURES.DOCUMENTS_LEGAL_REVIEW,
]

export interface LicenseInfo {
  tier: LicenseTier
  features: Feature[]
  isValid: boolean
  expiresAt?: Date
  role?: string
  subscriptionTier?: string | null
  /** Tenant branding from control plane (single-app multi-tenant) */
  displayName?: string | null
  logoUrl?: string | null
}

interface UserContext {
  id: number
  role: string
  subscriptionTier?: string | null
  adminId?: number | null
}

/**
 * Get the effective subscription tier for a user
 * - Super Admin: Returns 'platinum' with full access
 * - Admin: Returns their own subscriptionTier
 * - User: Looks up and returns their admin's subscriptionTier
 */
export async function getEffectiveSubscriptionTier(user: UserContext): Promise<{
  tier: LicenseTier
  isSuperAdmin: boolean
}> {
  // Super admin gets full access
  if (user.role === 'super_admin') {
    return { tier: 'platinum', isSuperAdmin: true }
  }
  
  // Admin uses their own subscription tier
  if (user.role === 'admin') {
    const tier = (user.subscriptionTier as LicenseTier) || 'basic'
    return { tier, isSuperAdmin: false }
  }
  
  // Regular user - look up their admin's tier
  if (user.adminId) {
    const admin = await prisma.user.findUnique({
      where: { id: user.adminId },
      select: { role: true, subscriptionTier: true }
    })
    
    if (admin) {
      // If the admin is a super_admin, user gets full access
      if (admin.role === 'super_admin') {
        return { tier: 'platinum', isSuperAdmin: true }
      }
      
      // Otherwise use admin's subscription tier
      const tier = (admin.subscriptionTier as LicenseTier) || 'basic'
      return { tier, isSuperAdmin: false }
    }
  }
  
  // Fallback - no admin found, use minimum tier
  return { tier: 'free', isSuperAdmin: false }
}

/**
 * Get license info based on logged-in user
 */
export async function getUserLicense(user: UserContext): Promise<LicenseInfo> {
  const { tier, isSuperAdmin } = await getEffectiveSubscriptionTier(user)
  
  // Super admin gets all features
  if (isSuperAdmin) {
    return {
      tier: 'platinum',
      features: ALL_FEATURES,
      isValid: true,
      role: user.role,
      subscriptionTier: 'platinum',
    }
  }
  
  // Get features for the tier
  const features = TIER_FEATURES[tier] || []
  
  return {
    tier,
    features,
    isValid: true,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
  }
}

// Cache for license info (per tenant domain)
const licenseCache = new Map<string, { info: LicenseInfo; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get tenant domain from request for license/branding lookup.
 * - Subdomain: acme.realestatehub.ca → "acme" (when APP_BASE_DOMAIN=realestatehub.ca)
 * - Custom domain: acmesrealty.com → "acmesrealty.com" (full host)
 * - Localhost: use X-Tenant-Domain header
 */
function getTenantDomain(event?: H3Event): string | null {
  if (!event) return null

  const tenantHeader = getHeader(event, 'x-tenant-domain')
  if (tenantHeader) {
    return tenantHeader
  }

  const host = (getHeader(event, 'host') || '').replace(/:.*$/, '').toLowerCase()
  if (!host) return null

  const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase()
  if (baseDomain && (host === baseDomain || host.endsWith('.' + baseDomain))) {
    const parts = host.slice(0, -baseDomain.length - 1).split('.')
    const subdomain = parts[parts.length - 1]
    return subdomain || null
  }

  return host
}

/**
 * Fetch license from SaaS Control Plane
 */
async function fetchFromControlPlane(domain: string): Promise<LicenseInfo | null> {
  const controlPlaneUrl = process.env.CONTROL_PLANE_URL
  const apiKey = process.env.CONTROL_PLANE_API_KEY
  
  if (!controlPlaneUrl) {
    return null // Control plane not configured
  }
  
  try {
    const response = await $fetch<{
      success: boolean
      data: {
        tier: LicenseTier
        features: Record<string, boolean>
        isValid: boolean
        displayName?: string | null
        logoUrl?: string | null
      }
    }>(`${controlPlaneUrl}/api/license/${encodeURIComponent(domain)}`, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      timeout: 5000,
    })
    
    if (!response.success) {
      return null
    }
    
    const features = Object.entries(response.data.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature as Feature)
    
    return {
      tier: response.data.tier,
      features,
      isValid: response.data.isValid,
      displayName: response.data.displayName ?? null,
      logoUrl: response.data.logoUrl ?? null,
    }
  } catch (error) {
    console.error('Failed to fetch license from control plane:', error)
    return null
  }
}

/**
 * Get the current tenant's license tier
 * Fetches from control plane if configured, otherwise uses env variable
 */
export async function getTenantLicense(event?: H3Event): Promise<LicenseInfo> {
  // Check if control plane is configured
  const controlPlaneUrl = process.env.CONTROL_PLANE_URL
  
  if (controlPlaneUrl) {
    // Try to get tenant domain from request
    const domain = getTenantDomain(event)
    
    if (domain) {
      // Check cache first
      const cached = licenseCache.get(domain)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.info
      }
      
      // Fetch from control plane
      const license = await fetchFromControlPlane(domain)
      
      if (license) {
        // Cache the result
        licenseCache.set(domain, { info: license, timestamp: Date.now() })
        return license
      }
    }
  }
  
  // Fallback: use env variable for development/single-tenant mode
  const envTier = process.env.LICENSE_TIER as LicenseTier || 'platinum'
  
  return {
    tier: envTier,
    features: TIER_FEATURES[envTier] || [],
    isValid: true,
  }
}

/**
 * Check if a feature is available for the current license (tenant-based)
 */
export async function hasFeature(feature: Feature, event?: H3Event): Promise<boolean> {
  const license = await getTenantLicense(event)
  return license.features.includes(feature)
}

/**
 * Check if a user has access to a specific feature
 * Uses the new user-based license model
 */
export async function userHasFeature(
  feature: Feature,
  user: UserContext
): Promise<boolean> {
  const license = await getUserLicense(user)
  return license.features.includes(feature)
}

/**
 * Check if user has access to a feature (considering role and subscription)
 */
export async function canAccessFeature(
  feature: Feature, 
  user: UserContext | null,
  event?: H3Event
): Promise<boolean> {
  if (!user) {
    // No user context, fall back to tenant-based license
    return hasFeature(feature, event)
  }
  
  // Use user-based license
  return userHasFeature(feature, user)
}

/**
 * Require a feature - throws error if not available (tenant-based)
 */
export async function requireFeature(feature: Feature, event: H3Event): Promise<void> {
  const hasAccess = await hasFeature(feature, event)
  
  if (!hasAccess) {
    const license = await getTenantLicense(event)
    throw createError({
      statusCode: 403,
      statusMessage: `Feature '${feature}' is not available on the ${license.tier} plan. Please upgrade to access this feature.`,
      data: {
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        currentTier: license.tier,
        requiredTier: getMinimumTierForFeature(feature),
      }
    })
  }
}

/**
 * Require a feature for a user - throws error if not available
 * Uses user-based license (checks admin's subscription tier)
 */
export async function requireFeatureForUser(
  feature: Feature, 
  user: UserContext,
  event: H3Event
): Promise<void> {
  const hasAccess = await userHasFeature(feature, user)
  
  if (!hasAccess) {
    const license = await getUserLicense(user)
    throw createError({
      statusCode: 403,
      statusMessage: `Feature '${feature}' is not available on the ${license.tier} plan. Please upgrade to access this feature.`,
      data: {
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        currentTier: license.tier,
        requiredTier: getMinimumTierForFeature(feature),
      }
    })
  }
}

/**
 * Require a feature for an admin endpoint
 * @deprecated Use requireFeatureForUser instead
 */
export async function requireFeatureForAdmin(
  feature: Feature, 
  user: { role: string },
  event: H3Event
): Promise<void> {
  // Super admin bypasses all restrictions
  if (user.role === 'super_admin') {
    return
  }
  
  // For other roles, check their effective tier
  // This is a backward-compatible shim - ideally use requireFeatureForUser
  await requireFeature(feature, event)
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: Feature): LicenseTier {
  const tiers: LicenseTier[] = ['basic', 'silver', 'gold', 'platinum']
  
  for (const tier of tiers) {
    if (TIER_FEATURES[tier].includes(feature)) {
      return tier
    }
  }
  
  return 'platinum'
}

/**
 * Get all features available for a tier
 */
export function getFeaturesForTier(tier: LicenseTier): Feature[] {
  return TIER_FEATURES[tier] || []
}

/**
 * Get feature access summary for client
 */
export async function getFeatureAccessSummary(event?: H3Event): Promise<Record<Feature, boolean>> {
  const license = await getTenantLicense(event)
  const allFeatures = Object.values(FEATURES) as Feature[]
  
  const summary: Record<string, boolean> = {}
  for (const feature of allFeatures) {
    summary[feature] = license.features.includes(feature)
  }
  
  return summary as Record<Feature, boolean>
}

/**
 * Get license info for client (tenant-based fallback).
 * When control plane is used, includes tenant branding (displayName, logoUrl).
 */
export async function getLicenseInfo(event?: H3Event): Promise<{
  tier: LicenseTier
  features: Record<Feature, boolean>
  role?: string
  isSuperAdmin?: boolean
  displayName?: string | null
  logoUrl?: string | null
}> {
  const controlPlaneUrl = process.env.CONTROL_PLANE_URL
  const domain = controlPlaneUrl ? getTenantDomain(event) : null

  const user = event?.context?.user as UserContext | undefined

  if (user) {
    const { tier, isSuperAdmin } = await getEffectiveSubscriptionTier(user)
    const license = await getUserLicense(user)
    const allFeatures = Object.values(FEATURES) as Feature[]
    const featureMap: Record<string, boolean> = {}
    for (const feature of allFeatures) {
      featureMap[feature] = license.features.includes(feature)
    }
    const out: {
      tier: LicenseTier
      features: Record<Feature, boolean>
      role?: string
      isSuperAdmin?: boolean
      displayName?: string | null
      logoUrl?: string | null
    } = {
      tier,
      features: featureMap as Record<Feature, boolean>,
      role: user.role,
      isSuperAdmin,
    }
    if (domain) {
      const tenantLicense = await getTenantLicense(event)
      out.displayName = tenantLicense.displayName ?? null
      out.logoUrl = tenantLicense.logoUrl ?? null
    }
    return out
  }

  const license = await getTenantLicense(event)
  const features = await getFeatureAccessSummary(event)
  return {
    tier: license.tier,
    features,
    displayName: license.displayName ?? null,
    logoUrl: license.logoUrl ?? null,
  }
}

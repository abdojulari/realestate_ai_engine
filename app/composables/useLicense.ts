// License Composable - Client-side feature access control
// Fetches license info from server and provides reactive feature checks
// The server determines feature access based on user's role and admin's subscription tier

import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

// Feature definitions (must match server/utils/license.ts)
export const FEATURES = {
  CMA: 'cma',
  CMA_REPORT: 'cma_report',
  CHATBOT: 'chatbot',
  AI_SEARCH: 'ai_search',
  AI_DESCRIPTION: 'ai_description',
  AI_INSIGHTS: 'ai_insights',
  FORECAST: 'forecast',
  ML_ANALYTICS: 'ml_analytics',
  ML_TRAINING: 'ml_training',
  NEWSLETTER: 'newsletter',
  NEWSLETTER_AUTOMATION: 'newsletter_automation',
  CREA_SYNC: 'crea_sync',
  PILLAR9_SYNC: 'pillar9_sync',
  DOCUMENTS_LEGAL_REVIEW: 'documents_legal_review',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]
export type LicenseTier = 'free' | 'basic' | 'silver' | 'gold' | 'platinum' | 'enterprise'

interface LicenseInfo {
  tier: LicenseTier
  features: Record<Feature, boolean>
  role?: string
  isSuperAdmin?: boolean
  /** Tenant branding (multi-tenant from control plane) */
  displayName?: string | null
  logoUrl?: string | null
}

// Global state for license info
const licenseInfo = ref<LicenseInfo | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useLicense() {
  const authStore = useAuthStore()
  
  // Fetch license info from server
  // If authenticated, sends token to get user-specific license
  const fetchLicense = async () => {
    if (loading.value) return
    
    try {
      loading.value = true
      error.value = null
      
      // Build headers with auth token if available
      const headers: Record<string, string> = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }
      
      const response = await $fetch<{ success: boolean; data: LicenseInfo }>('/api/license', {
        headers,
      })
      
      if (response.success && response.data) {
        licenseInfo.value = response.data
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch license info'
      console.error('License fetch error:', e)
    } finally {
      loading.value = false
    }
  }

  // Check if user is super admin (has unrestricted access)
  const isSuperAdmin = computed(() => {
    return licenseInfo.value?.isSuperAdmin === true || authStore.user?.role === 'super_admin'
  })

  // Check if user has full access (super admin or platinum tier)
  const hasFullAccess = computed(() => {
    if (isSuperAdmin.value) return true
    if (licenseInfo.value?.tier === 'platinum' || licenseInfo.value?.tier === 'enterprise') return true
    return false
  })

  // Check if a feature is available
  // The server already computed this based on user's effective tier
  const hasFeature = (feature: Feature): boolean => {
    // Super admin always has full access
    if (isSuperAdmin.value) return true
    if (!licenseInfo.value) return false
    return licenseInfo.value.features[feature] === true
  }

  // Get current tier
  const currentTier = computed(() => licenseInfo.value?.tier || 'free')

  // Tier display names
  const tierDisplayName = computed(() => {
    const names: Record<LicenseTier, string> = {
      free: 'Free',
      basic: 'Basic',
      silver: 'Silver',
      gold: 'Gold',
      platinum: 'Platinum',
      enterprise: 'Enterprise',
    }
    return names[currentTier.value]
  })

  // Feature access helpers
  const canUseCMA = computed(() => hasFeature(FEATURES.CMA))
  const canUseChatbot = computed(() => hasFeature(FEATURES.CHATBOT))
  const canUseAISearch = computed(() => hasFeature(FEATURES.AI_SEARCH))
  const canUseForecast = computed(() => hasFeature(FEATURES.FORECAST))
  const canUseNewsletter = computed(() => hasFeature(FEATURES.NEWSLETTER))
  const canUseNewsletterAutomation = computed(() => hasFeature(FEATURES.NEWSLETTER_AUTOMATION))
  const canUseCREASync = computed(() => hasFeature(FEATURES.CREA_SYNC))
  const canUsePillar9Sync = computed(() => hasFeature(FEATURES.PILLAR9_SYNC))
  const canUseDocumentsLegalReview = computed(() => hasFeature(FEATURES.DOCUMENTS_LEGAL_REVIEW))

  // Check if current plan has any AI features
  const hasAnyAI = computed(() => {
    return canUseChatbot.value || canUseAISearch.value || canUseForecast.value
  })

  // Get upgrade recommendation for a feature
  const getUpgradeRecommendation = (feature: Feature): LicenseTier | null => {
    if (hasFeature(feature)) return null

    const featureToTier: Record<Feature, LicenseTier> = {
      [FEATURES.CMA]: 'silver',
      [FEATURES.CMA_REPORT]: 'silver',
      [FEATURES.CHATBOT]: 'gold',
      [FEATURES.AI_SEARCH]: 'platinum',
      [FEATURES.AI_DESCRIPTION]: 'gold',
      [FEATURES.AI_INSIGHTS]: 'platinum',
      [FEATURES.FORECAST]: 'platinum',
      [FEATURES.ML_ANALYTICS]: 'platinum',
      [FEATURES.ML_TRAINING]: 'platinum',
      [FEATURES.NEWSLETTER]: 'basic',
      [FEATURES.NEWSLETTER_AUTOMATION]: 'silver',
      [FEATURES.CREA_SYNC]: 'platinum',
      [FEATURES.PILLAR9_SYNC]: 'platinum',
      [FEATURES.DOCUMENTS_LEGAL_REVIEW]: 'silver',
    }

    return featureToTier[feature] || 'platinum'
  }

  // Initialize on mount
  onMounted(() => {
    if (!licenseInfo.value) {
      fetchLicense()
    }
  })
  
  // Refetch license when auth state changes
  watch(
    () => authStore.token,
    (newToken, oldToken) => {
      if (newToken !== oldToken) {
        // Reset and refetch when user logs in/out
        licenseInfo.value = null
        fetchLicense()
      }
    }
  )

  return {
    // State
    licenseInfo,
    loading,
    error,
    currentTier,
    tierDisplayName,
    isSuperAdmin,
    hasFullAccess,

    // Methods
    fetchLicense,
    hasFeature,
    getUpgradeRecommendation,

    // Feature flags
    canUseCMA,
    canUseChatbot,
    canUseAISearch,
    canUseForecast,
    canUseNewsletter,
    canUseNewsletterAutomation,
    canUseCREASync,
    canUsePillar9Sync,
    canUseDocumentsLegalReview,
    hasAnyAI,

    // Constants
    FEATURES,
  }
}

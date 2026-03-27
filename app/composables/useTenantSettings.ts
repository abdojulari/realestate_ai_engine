/**
 * useTenantSettings
 * ─────────────────
 * Fetches the current tenant's public settings (branding, contact info,
 * social links, footer disclaimer, etc.) from the DB via /api/tenant-settings.
 *
 * All hardcoded content in Header/Footer has been moved into TenantSettings
 * in the database.  This composable replaces the old static values.
 */

import { ref, computed, onMounted } from 'vue'

export interface SocialLink {
  icon: string
  name: string
  url: string
}

export interface TenantSettingsData {
  id: number | null
  businessName: string | null
  tagline: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  socialLinks: SocialLink[] | null
  brokerageName: string | null
  brokerageLogoUrl: string | null
  footerDisclaimer: string | null
  copyrightName: string | null
  developerName: string | null
  developerUrl: string | null
}

// ── Global state (shared across components) ──
const tenantSettings = ref<TenantSettingsData | null>(null)
const loading = ref(false)
const loaded = ref(false)

export function useTenantSettings() {
  const fetchSettings = async () => {
    if (loading.value || loaded.value) return
    loading.value = true
    try {
      const data = await $fetch<TenantSettingsData>('/api/tenant-settings')
      tenantSettings.value = data
      loaded.value = true
    } catch (e: any) {
      console.error('Failed to fetch tenant settings:', e)
    } finally {
      loading.value = false
    }
  }

  const refresh = async () => {
    loading.value = true
    try {
      const data = await $fetch<TenantSettingsData>('/api/tenant-settings')
      tenantSettings.value = data
      loaded.value = true
    } catch (e: any) {
      console.error('Failed to refresh tenant settings:', e)
    } finally {
      loading.value = false
    }
  }

  // ── Computed helpers ──

  const businessName = computed(() => tenantSettings.value?.businessName || '')
  const tagline = computed(() => tenantSettings.value?.tagline || 'Intelligence for Realtors')
  const logoUrl = computed(() => tenantSettings.value?.logoUrl || '/images/logos/deelbot.png')
  const faviconUrl = computed(() => tenantSettings.value?.faviconUrl || '')
  const primaryColor = computed(() => tenantSettings.value?.primaryColor || '#1976D2')
  const phone = computed(() => tenantSettings.value?.phone || '')
  const contactEmail = computed(() => tenantSettings.value?.email || '')
  const address = computed(() => tenantSettings.value?.address || '')
  const city = computed(() => tenantSettings.value?.city || '')
  const province = computed(() => tenantSettings.value?.province || '')
  const postalCode = computed(() => tenantSettings.value?.postalCode || '')
  const socialLinks = computed<SocialLink[]>(() => {
    const links = tenantSettings.value?.socialLinks
    if (Array.isArray(links)) return links
    return []
  })
  const brokerageName = computed(() => tenantSettings.value?.brokerageName || '')
  const brokerageLogoUrl = computed(() => tenantSettings.value?.brokerageLogoUrl || '')
  const footerDisclaimer = computed(() => tenantSettings.value?.footerDisclaimer || '')
  const copyrightName = computed(() => tenantSettings.value?.copyrightName || businessName.value || '')
  const developerName = computed(() => tenantSettings.value?.developerName || '')
  const developerUrl = computed(() => tenantSettings.value?.developerUrl || '')

  // Initialize on mount
  onMounted(() => {
    if (!loaded.value) fetchSettings()
  })

  return {
    tenantSettings,
    loading,
    fetchSettings,
    refresh,

    // Computed
    businessName,
    tagline,
    logoUrl,
    faviconUrl,
    primaryColor,
    phone,
    contactEmail,
    address,
    city,
    province,
    postalCode,
    socialLinks,
    brokerageName,
    brokerageLogoUrl,
    footerDisclaimer,
    copyrightName,
    developerName,
    developerUrl,
  }
}

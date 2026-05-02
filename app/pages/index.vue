<template>
  <div v-if="loading" class="d-flex align-center justify-center" style="min-height: 100vh;">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </div>
  <component 
    v-else
    :key="`template-${activeTemplate}`"
    :is="activeTemplateComponent"
    :featured-properties="featuredProperties"
    :hero-image="heroImage"
    :featured-testimonials="featuredTestimonials"
    :total-users="totalUsers"
    :total-properties="totalProperties"
    :awards-count="awardsCount"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HomeTemplate1 from '~/components/home-templates/HomeTemplate1.vue'
import HomeTemplate2 from '~/components/home-templates/HomeTemplate2.vue'

const { businessName, adminFullName } = useTenantSettings()
useSeoMeta({
  title: () => businessName.value || 'Real Estate',
  ogTitle: () => businessName.value || 'Real Estate',
  description: () => `${adminFullName.value || 'Your trusted REALTOR'} — search homes, get market insights, and find your dream property.`,
  ogDescription: () => `${adminFullName.value || 'Your trusted REALTOR'} — search homes, get market insights, and find your dream property.`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

// SSR-safe tenant fetch for LocalBusiness JSON-LD on the homepage.
// Layout already emits Organization/RealEstateAgent — this adds the
// LocalBusiness variant + WebSite schema with SearchAction (sitelinks search box).
const { data: homeTenant } = await useAsyncData('home-tenant-settings', async () => {
  try {
    return await $fetch<any>('/api/tenant-settings')
  } catch {
    return null
  }
})

const homeSiteUrl = useSiteUrl()
const homeAbsoluteUrl = (p: string | null | undefined) => useAbsoluteUrl(p)

const homeSchemas = computed(() => {
  const t = homeTenant.value
  const out: any[] = []

  if (homeSiteUrl) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t?.businessName || 'Real Estate',
      url: homeSiteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${homeSiteUrl}/properties?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    })
  }

  if (t) {
    const sameAs = Array.isArray(t.socialLinks)
      ? t.socialLinks.map((s: any) => s?.url).filter(Boolean)
      : []

    const local: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': homeSiteUrl ? `${homeSiteUrl}/#localbusiness` : undefined,
      name: t.businessName || undefined,
      image: homeAbsoluteUrl(t.logoUrl) || undefined,
      logo: homeAbsoluteUrl(t.logoUrl) || undefined,
      url: homeSiteUrl || undefined,
      telephone: t.phone || undefined,
      email: t.email || undefined,
      priceRange: '$$',
      sameAs: sameAs.length ? sameAs : undefined,
    }
    if (t.address || t.city || t.province || t.postalCode) {
      local.address = {
        '@type': 'PostalAddress',
        streetAddress: t.address || undefined,
        addressLocality: t.city || undefined,
        addressRegion: t.province || undefined,
        postalCode: t.postalCode || undefined,
        addressCountry: 'CA',
      }
    }
    if (t.city && t.province) {
      local.areaServed = {
        '@type': 'AdministrativeArea',
        name: `${t.city}, ${t.province}`,
      }
    }
    Object.keys(local).forEach((k) => local[k] === undefined && delete local[k])
    out.push(local)
  }

  return out
})

useHead({
  script: () =>
    homeSchemas.value.length
      ? homeSchemas.value.map((s) => ({
          type: 'application/ld+json',
          children: JSON.stringify(s),
        }))
      : [],
})
import HomeTemplate3 from '~/components/home-templates/HomeTemplate3.vue'
import HomeTemplate4 from '~/components/home-templates/HomeTemplate4.vue'
import HomeTemplate5 from '~/components/home-templates/HomeTemplate5.vue'

const loading = ref(true)
const activeTemplate = ref(1)
const featuredProperties = ref<any[]>([])
const heroImage = ref<string>('')
const featuredTestimonials = ref<any[]>([])
const totalUsers = ref<number>(0)
const totalProperties = ref<number>(0)
const awardsCount = ref<number>(0)

// Template components mapping
const templateComponents: Record<number, any> = {
  1: HomeTemplate1,
  2: HomeTemplate2,
  3: HomeTemplate3,
  4: HomeTemplate4,
  5: HomeTemplate5
}

const activeTemplateComponent = computed(() => {
  const component = templateComponents[activeTemplate.value] || HomeTemplate1
  console.log(`🎨 Rendering template component: Template ${activeTemplate.value}`)
  return component
})

onMounted(async () => {
  try {
    // Load active template - add cache busting to ensure fresh data
    const templateData = await $fetch('/api/settings/home-template', {
      query: { _t: Date.now() } // Cache busting
    })
    console.log('📄 Template API response:', templateData)
    const templateNumber = templateData?.template ? Number(templateData.template) : 1
    console.log('📄 Parsed template number:', templateNumber, 'Type:', typeof templateNumber)
    activeTemplate.value = templateNumber
    console.log('📄 Set activeTemplate.value to:', activeTemplate.value)
  } catch (error) {
    console.error('❌ Failed to load template setting:', error)
    activeTemplate.value = 1
  }

  // Load Stats. These are decorative — if they fail we keep going so the
  // rest of the homepage still renders, but we log so on-call sees the
  // failure instead of silently shipping a broken section.
  // /api/stats returns tenant-scoped counts: totalUsers (admin + their users)
  // and totalProperties (CREA + Pillar9 shared MLS + this tenant's manual listings).
  try {
    const stats: any = await $fetch('/api/stats')
    if (typeof stats?.totalUsers === 'number') totalUsers.value = stats.totalUsers
    if (typeof stats?.totalProperties === 'number') totalProperties.value = stats.totalProperties
  } catch (e) {
    console.warn('[home] Failed to load /api/stats', e)
  }

  // Awards-won is admin-editable per tenant via the CMS branding panel.
  try {
    const ts: any = await $fetch('/api/tenant-settings')
    if (typeof ts?.awardsCount === 'number') awardsCount.value = ts.awardsCount
  } catch (e) {
    console.warn('[home] Failed to load /api/tenant-settings for awardsCount', e)
  }

  // Load Properties
  try {
    const response = await $fetch('/api/properties?limit=10&status=for_sale')
    featuredProperties.value = Array.isArray(response) ? response : response?.properties || []
  } catch (e) {
    console.warn('[home] Failed to load featured properties', e)
  }

  // Load Testimonials
  try {
    const testimonials = await $fetch('/api/testimonials?limit=10')
    featuredTestimonials.value = testimonials || []
  } catch (e) {
    console.warn('[home] Failed to load testimonials', e)
  }

  loading.value = false
})
</script>
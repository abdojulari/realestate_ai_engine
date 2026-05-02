<template>
  <div class="app-layout">
    <Header />
    <FlashNewsBanner />
    <main class="main-content">
      <slot />
    </main>
    <Footer />
    <CookieConsent />
    <ChatLauncher />
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/Header.vue'
import FlashNewsBanner from '~/components/FlashNewsBanner.vue'
import Footer from '~/components/Footer.vue'
import CookieConsent from '~/components/CookieConsent.vue'
import ChatLauncher from '~/components/chat/ChatLauncher.vue'

// SSR-safe tenant settings fetch for global JSON-LD schema.
// Uses useAsyncData so the schema is rendered server-side for crawlers.
const { data: tenant } = await useAsyncData('layout-tenant-settings', async () => {
  try {
    return await $fetch<any>('/api/tenant-settings')
  } catch {
    return null
  }
})

const siteUrl = useSiteUrl()
const absoluteUrl = (path: string | null | undefined) => useAbsoluteUrl(path)

const organizationSchema = computed(() => {
  const t = tenant.value
  if (!t) return null

  const sameAs = Array.isArray(t.socialLinks)
    ? t.socialLinks.map((s: any) => s?.url).filter(Boolean)
    : []

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: t.businessName || undefined,
    url: siteUrl || undefined,
    logo: absoluteUrl(t.logoUrl) || undefined,
    image: absoluteUrl(t.logoUrl) || undefined,
    telephone: t.phone || undefined,
    email: t.email || undefined,
    description: t.tagline || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }

  if (t.address || t.city || t.province || t.postalCode) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: t.address || undefined,
      addressLocality: t.city || undefined,
      addressRegion: t.province || undefined,
      postalCode: t.postalCode || undefined,
      addressCountry: 'CA',
    }
  }

  // Drop undefined fields for clean output
  Object.keys(schema).forEach((k) => schema[k] === undefined && delete schema[k])
  return schema
})

useHead({
  script: () =>
    organizationSchema.value
      ? [
          {
            type: 'application/ld+json',
            children: JSON.stringify(organizationSchema.value),
          },
        ]
      : [],
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}
</style>

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

// Capture origin ONCE at setup. Calling useSiteUrl()/useAbsoluteUrl() inside
// the computed below would re-enter the Nuxt scope when unhead walks the head
// tags after SSR has finished, throwing "[nuxt] instance unavailable" → 500.
const siteUrl = useSiteUrl()

// ── Meta (Facebook) Pixel resolution ────────────────────────────────────
// Tenant override wins; otherwise we fall back to the platform-wide
// NUXT_PUBLIC_META_PIXEL_ID. Empty/null on both → no pixel injected.
// Captured once at setup (same reasoning as siteUrl above — avoid invoking
// composables from inside the head walker after SSR has finished).
const runtimeMetaPixelId = useRuntimeConfig().public.metaPixelId as string | undefined
const metaPixelId = (tenant.value?.metaPixelId || runtimeMetaPixelId || '').toString().trim()

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
    logo: absolutizeUrl(siteUrl, t.logoUrl) || undefined,
    image: absolutizeUrl(siteUrl, t.logoUrl) || undefined,
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
  script: () => {
    const scripts: Array<Record<string, unknown>> = []

    if (organizationSchema.value) {
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify(organizationSchema.value),
      })
    }

    // ── Meta (Facebook) Pixel — official snippet ────────────────────
    // Injected per-tenant from SSR so the pixel id is correct for THIS
    // realtor before the bundle parses, no flash, no missed first
    // PageView. We stash the resolved id on `window.__metaPixelId` so
    // the route-change plugin can introspect it for diagnostics.
    if (metaPixelId) {
      const id = JSON.stringify(metaPixelId)
      scripts.push({
        // Tag this so we can diff in browser devtools and prove the
        // right id rendered for the right host.
        'data-meta-pixel-id': metaPixelId,
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');window.__metaPixelId=${id};fbq('init',${id});fbq('track','PageView');`,
      })
    }

    return scripts
  },
  // Pixel <noscript> fallback so visitors with JS disabled still register
  // a PageView via the 1×1 tracking image.
  noscript: () =>
    metaPixelId
      ? [
          {
            children: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1" />`,
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

<template>
  <div v-if="loading" class="ic-loading">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else-if="error" class="ic-empty">
    <v-icon size="56" color="grey-lighten-1">mdi-card-account-details-outline</v-icon>
    <h2 class="text-h6 mt-4 mb-1">Card not found</h2>
    <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 320px">
      This link may be inactive or the agent has disabled their card.
    </p>
  </div>

  <div v-else class="ic-shell" :style="cssVars">
    <!-- HERO -->
    <main class="ic-main">
      <section class="ic-hero">
        <div class="ic-hero__bg">
          <img
            v-if="data.branding.coverImage"
            :src="data.branding.coverImage"
            alt=""
            class="ic-hero__cover"
          />
          <div v-else class="ic-hero__cover ic-hero__cover--default" />
        </div>

        <div class="ic-hero__card">
          <div class="ic-hero__avatar">
            <img
              :src="data.profile.avatar || '/icons/deelbot-512.png'"
              :alt="data.profile.fullName"
            />
          </div>
          <div class="ic-hero__body">
            <h1 class="ic-hero__name">{{ data.profile.fullName }}</h1>
            <div class="ic-hero__role">
              {{ (data.profile.headline || 'Real Estate Agent').toUpperCase() }}
            </div>
            <div v-if="data.profile.company" class="ic-hero__company">
              {{ data.profile.company }}
            </div>
            <div v-if="data.profile.phone" class="ic-hero__line">
              <a :href="`tel:${data.profile.phone}`">{{ data.profile.phone }}</a>
            </div>
            <div v-if="data.profile.email" class="ic-hero__line ic-hero__line--email">
              <a :href="`mailto:${data.profile.email}`">{{ data.profile.email }}</a>
            </div>
          </div>
        </div>

        <div v-if="socialLinks.length" class="ic-socials">
          <a
            v-for="s in socialLinks"
            :key="s.name + s.url"
            :href="s.url"
            target="_blank"
            rel="noopener"
            class="ic-social"
            :aria-label="s.name"
          >
            <v-icon size="22">{{ socialIcon(s) }}</v-icon>
          </a>
        </div>
      </section>

      <!-- STEP 1: SAVE VCARD -->
      <section v-if="step === 'save'" class="ic-actions">
        <div class="ic-step">
          <span class="ic-step__num">1</span>
          <div class="ic-step__title">Save my contact to your phone</div>
          <p class="ic-step__hint">
            Tap below — your phone will open the "Add to Contacts" sheet.
          </p>
        </div>

        <v-btn
          color="primary"
          class="ic-btn-primary"
          block
          size="large"
          prepend-icon="mdi-account-plus"
          @click="onSaveContact"
        >
          Save {{ data.profile.firstName }} to my contacts
        </v-btn>

        <button class="ic-link-btn" @click="goToForm">
          Skip — share my details instead →
        </button>
      </section>

      <!-- STEP 2: PROMPT TO CONTINUE TO FORM (after vCard tap) -->
      <section v-else-if="step === 'thanks'" class="ic-actions">
        <div class="ic-step ic-step--done">
          <v-icon color="success" size="28" class="mb-2">mdi-check-circle</v-icon>
          <div class="ic-step__title">Contact saved</div>
          <p class="ic-step__hint">
            One last step — share your details so {{ data.profile.firstName }} can reach out.
          </p>
        </div>

        <v-btn
          color="primary"
          class="ic-btn-primary"
          block
          size="large"
          prepend-icon="mdi-message-text-outline"
          @click="goToForm"
        >
          Share my details
        </v-btn>

        <button class="ic-link-btn" @click="onSaveContact">
          Re-download contact card
        </button>
      </section>

      <!-- INSTALL BANNER (only outside PWA) -->
      <section v-if="showInstallBanner" class="ic-install">
        <div class="ic-install__icon">
          <img src="/icons/deelbot-192.png" alt="DeelBot" />
        </div>
        <div class="ic-install__body">
          <div class="ic-install__title">
            Save {{ data.profile.firstName }} to your home screen
          </div>
          <div class="ic-install__sub">
            <template v-if="isIos">
              Tap <v-icon size="14" class="mx-1">mdi-export-variant</v-icon> then
              <strong>Add to Home Screen</strong>.
            </template>
            <template v-else>
              Install this card so it's one tap away.
            </template>
          </div>
        </div>
        <div class="ic-install__action">
          <v-btn
            v-if="canInstall && !isIos"
            color="primary"
            class="ic-btn-primary ic-btn-primary--small"
            @click="onInstallClick"
          >
            Install
          </v-btn>
          <v-btn v-else variant="text" size="small" @click="dismissInstall">Dismiss</v-btn>
        </div>
      </section>

      <!-- ABOUT -->
      <section v-if="data.profile.bio" class="ic-about">
        <h3 class="ic-about__title">About me</h3>
        <p class="ic-about__body">{{ data.profile.bio }}</p>
      </section>
    </main>

    <footer class="ic-footer">
      <span>Powered by</span>
      <strong>DeelBot</strong>
    </footer>

    <v-snackbar v-model="snack.show" :color="snack.color" location="top" :timeout="3000">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter, useHead } from '#imports'
import { usePwaInstall } from '~/composables/usePwaInstall'

definePageMeta({ layout: false })

interface SocialLink { icon?: string | null; name: string; url: string }
interface CardData {
  slug: string
  profile: {
    firstName: string
    lastName: string
    fullName: string
    email: string | null
    phone: string | null
    avatar: string | null
    bio: string | null
    headline: string
    company: string
    location: string
  }
  branding: {
    primaryColor: string
    coverImage: string | null
    logoUrl: string | null
    brokerageLogoUrl: string | null
    socialLinks: SocialLink[]
  }
}

const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug || '').toLowerCase())

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CardData | null>(null) as { value: CardData | null } & { value: any }
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })
const installDismissed = ref(false)
const step = ref<'save' | 'thanks'>('save')

const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall()

const showInstallBanner = computed(() => {
  if (installDismissed.value) return false
  if (isStandalone.value) return false
  if (isIos.value) return true
  return canInstall.value
})

const cssVars = computed(() => {
  const c = data.value?.branding?.primaryColor || '#0F172A'
  return {
    '--ic-primary': c,
    '--ic-primary-soft': hexAlpha(c, 0.12),
  } as Record<string, string>
})

const socialLinks = computed<SocialLink[]>(() => data.value?.branding?.socialLinks || [])

function socialIcon(s: SocialLink): string {
  if (s.icon) return s.icon
  const url = (s.url || '').toLowerCase()
  if (url.includes('instagram')) return 'mdi-instagram'
  if (url.includes('facebook')) return 'mdi-facebook'
  if (url.includes('linkedin')) return 'mdi-linkedin'
  if (url.includes('twitter') || url.includes('x.com')) return 'mdi-twitter'
  if (url.includes('youtube')) return 'mdi-youtube'
  if (url.includes('tiktok')) return 'mdi-music-note'
  if (url.includes('whatsapp')) return 'mdi-whatsapp'
  return 'mdi-link-variant'
}

function hexAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return `rgba(15,23,42,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

const vcardUrl = computed(() => `/api/insta-connect/${slug.value}/vcard`)

async function loadCard() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<CardData>(`/api/insta-connect/${slug.value}`)
    data.value = res
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Card not available'
  } finally {
    loading.value = false
  }
}

function onSaveContact() {
  if (typeof window === 'undefined') return
  // Trigger vCard download via hidden anchor — keeps the page in place so we
  // can advance the visitor to step 2 (form).
  const a = document.createElement('a')
  a.href = vcardUrl.value
  a.rel = 'noopener'
  a.setAttribute('download', `${data.value?.profile.firstName || 'contact'}.vcf`)
  document.body.appendChild(a)
  a.click()
  a.remove()
  step.value = 'thanks'
  // Auto-advance to the form after a short pause so user sees the success state.
  setTimeout(() => {
    if (step.value === 'thanks') goToForm()
  }, 2200)
}

function goToForm() {
  router.push(`/connect/${slug.value}/connect`)
}

async function onInstallClick() {
  const outcome = await promptInstall()
  if (outcome === 'unavailable') {
    snack.color = 'success'
    snack.msg = 'Use your browser menu → "Add to Home Screen"'
    snack.show = true
  }
}

function dismissInstall() {
  installDismissed.value = true
}

useHead(() => ({
  title: data.value?.profile.fullName ? `${data.value.profile.fullName} — Instacard` : 'Instacard',
  meta: [
    { name: 'theme-color', content: data.value?.branding?.primaryColor || '#0F172A' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: data.value?.profile.firstName || 'Instacard' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    {
      name: 'description',
      content: data.value?.profile.fullName
        ? `Connect with ${data.value.profile.fullName}.`
        : 'Digital business card.',
    },
  ],
  link: [
    { rel: 'manifest', href: `/api/insta-connect/${slug.value}/manifest` },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/deelbot-apple-touch-180.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/deelbot-192.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/deelbot-512.png' },
  ],
}))

onMounted(async () => {
  await loadCard()
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-instaconnect.js', { scope: '/connect/' })
    } catch (e) {
      console.warn('[InstaConnect] SW registration failed', e)
    }
  }
})

watch(slug, loadCard)
</script>

<style scoped>
.ic-loading,
.ic-empty {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.ic-shell {
  --ic-primary: #0f172a;
  --ic-primary-soft: rgba(15, 23, 42, 0.12);
  min-height: 100vh;
  background: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  padding-top: env(safe-area-inset-top);
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}

.ic-main { padding: 0 0 8px; }
.ic-hero {
  position: relative;
  padding: 32px 18px 8px;
}
.ic-hero__bg { position: absolute; inset: 0; overflow: hidden; }
.ic-hero__cover {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.88);
}
.ic-hero__cover--default {
  background:
    linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 100%),
    radial-gradient(circle at 30% 20%, var(--ic-primary-soft), transparent 60%),
    linear-gradient(135deg, #93c5fd 0%, #60a5fa 50%, #1d4ed8 100%);
  height: 100%;
}
.ic-hero__card {
  position: relative;
  z-index: 1;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border-radius: 22px;
  padding: 22px 22px 26px;
  text-align: center;
  box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.45);
  max-width: 360px;
  margin: 76px auto 18px;
  backdrop-filter: blur(8px);
}
.ic-hero__avatar {
  width: 132px; height: 132px;
  margin: -78px auto 14px;
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  border: 4px solid #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
}
.ic-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
.ic-hero__name {
  font-size: 1.45rem; font-weight: 800; margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.ic-hero__role {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}
.ic-hero__company { font-weight: 700; margin-bottom: 8px; }
.ic-hero__line { font-size: 0.95rem; line-height: 1.5; }
.ic-hero__line a { color: #fff; text-decoration: none; }
.ic-hero__line--email a { font-size: 0.85rem; opacity: 0.9; }

.ic-socials {
  position: relative; z-index: 1;
  display: flex; justify-content: center; gap: 14px;
  padding: 8px 0 6px;
}
.ic-social {
  width: 44px; height: 44px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #fff;
  color: var(--ic-primary);
  text-decoration: none;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
  border: 1px solid #f1f5f9;
}

/* ACTIONS */
.ic-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 18px 8px;
  max-width: 420px;
  margin: 0 auto;
}
.ic-step {
  text-align: center;
  margin-bottom: 6px;
}
.ic-step__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--ic-primary);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.ic-step__title { font-weight: 800; font-size: 1.05rem; }
.ic-step__hint {
  font-size: 0.85rem;
  color: #64748b;
  margin: 6px auto 4px;
  max-width: 320px;
}
.ic-step--done .ic-step__title { color: #047857; }
.ic-link-btn {
  background: transparent;
  border: 0;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px;
  cursor: pointer;
  text-align: center;
}

/* INSTALL BANNER */
.ic-install {
  margin: 18px auto 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 420px;
}
.ic-install__icon img { width: 38px; height: 38px; border-radius: 10px; }
.ic-install__body { flex: 1; min-width: 0; }
.ic-install__title { font-weight: 700; font-size: 0.92rem; }
.ic-install__sub { font-size: 0.78rem; color: #64748b; }

/* ABOUT */
.ic-about {
  padding: 24px 18px 30px;
  max-width: 560px; margin: 0 auto;
}
.ic-about__title {
  font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ic-primary); margin-bottom: 8px; font-weight: 700;
}
.ic-about__body { line-height: 1.65; color: #334155; }

.ic-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 18px;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: #94a3b8;
}
.ic-footer strong { color: #475569; font-weight: 700; }

.ic-btn-primary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
  letter-spacing: -0.01em !important;
}
.ic-btn-primary--small { height: 40px !important; }

@media (max-width: 360px) {
  .ic-hero__avatar { width: 116px; height: 116px; margin-top: -68px; }
}
</style>

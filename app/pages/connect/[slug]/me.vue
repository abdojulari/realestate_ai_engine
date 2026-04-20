<template>
  <div v-if="loading" class="me-loading">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else-if="error" class="me-empty">
    <v-icon size="56" color="grey-lighten-1">mdi-card-account-details-outline</v-icon>
    <h2 class="text-h6 mt-4 mb-1">Card not available</h2>
    <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 320px">
      This card may be inactive or was disabled.
    </p>
  </div>

  <div v-else class="me-shell" :style="cssVars">
    <!-- Top brand bar (brokerage logo + profile / menu) -->
    <header class="me-topbar">
      <div class="me-topbar__brand">
        <img
          v-if="data.branding.brokerageLogoUrl || data.branding.logoUrl"
          :src="data.branding.brokerageLogoUrl || data.branding.logoUrl"
          alt="Brokerage"
          class="me-topbar__logo"
        />
        <div v-else class="me-topbar__fallback">
          <img src="/icons/deelbot-192.png" alt="DeelBot" />
        </div>
      </div>
      <div class="me-topbar__actions">
        <v-btn
          icon="mdi-account-circle-outline"
          variant="text"
          density="comfortable"
          aria-label="Profile"
          :to="capturesUrl"
        />
        <v-btn
          icon="mdi-menu"
          variant="text"
          density="comfortable"
          aria-label="Menu"
          @click="menuOpen = true"
        />
      </div>
    </header>

    <!-- Hero card (matches the design reference) -->
    <main class="me-main">
      <section class="me-hero">
        <div class="me-hero__bg">
          <img
            v-if="data.branding.coverImage"
            :src="data.branding.coverImage"
            alt=""
            class="me-hero__cover"
          />
          <div v-else class="me-hero__cover me-hero__cover--default" />
        </div>

        <article class="me-card">
          <div class="me-card__avatar">
            <img
              :src="data.profile.avatar || '/icons/deelbot-512.png'"
              :alt="data.profile.fullName"
            />
          </div>
          <div class="me-card__body">
            <h1 class="me-card__name">{{ data.profile.fullName }}</h1>
            <div class="me-card__role">
              {{ (data.profile.headline || 'Real Estate Agent').toUpperCase() }}
            </div>
            <div v-if="data.profile.company" class="me-card__company">
              {{ data.profile.company }}
            </div>
            <div v-if="data.profile.phone" class="me-card__line">
              <a :href="`tel:${data.profile.phone}`">{{ data.profile.phone }}</a>
            </div>
            <div v-if="data.profile.email" class="me-card__line me-card__line--email">
              <a :href="`mailto:${data.profile.email}`">{{ data.profile.email }}</a>
            </div>
          </div>
        </article>

        <div v-if="socialLinks.length" class="me-socials">
          <a
            v-for="s in socialLinks"
            :key="s.name + s.url"
            :href="s.url"
            target="_blank"
            rel="noopener"
            class="me-social"
            :aria-label="s.name"
          >
            <v-icon size="22" :color="socialColor(s)">{{ socialIcon(s) }}</v-icon>
          </a>
        </div>
      </section>
    </main>

    <!-- Bottom dock: HOME / SHARE / CONTACTS -->
    <nav class="me-dock">
      <button
        type="button"
        class="me-dock__btn"
        :class="{ 'is-active': activeTab === 'home' }"
        @click="onHome"
      >
        <v-icon size="22">mdi-home</v-icon>
        <span>HOME</span>
      </button>

      <button
        type="button"
        class="me-dock__btn me-dock__btn--center"
        @click="openShare"
        aria-label="Share my card"
      >
        <span class="me-dock__center">
          <v-icon size="26" color="white">mdi-qrcode-scan</v-icon>
        </span>
        <span class="me-dock__center-label">SHARE</span>
      </button>

      <button
        type="button"
        class="me-dock__btn"
        @click="onContacts"
      >
        <div class="me-dock__icon-wrap">
          <v-icon size="22">mdi-account-multiple</v-icon>
          <span v-if="pendingCount > 0" class="me-dock__badge">
            {{ pendingCount > 99 ? '99+' : pendingCount }}
          </span>
        </div>
        <span>CONTACTS</span>
      </button>
    </nav>

    <!-- Share sheet (SMS / Email / QR for in-person / Copy link) -->
    <v-bottom-sheet v-model="shareOpen" inset>
      <v-card class="me-sheet" rounded="xl">
        <div class="me-sheet__handle" />
        <div class="me-sheet__head">
          <div>
            <div class="me-sheet__title">Share my card</div>
            <div class="me-sheet__sub">Pick how your client should receive it</div>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="shareOpen = false" />
        </div>

        <div class="me-sheet__grid">
          <button class="me-share-tile" @click="shareViaSms">
            <span class="me-share-tile__icon" style="background:#10b981">
              <v-icon size="22" color="white">mdi-message-text</v-icon>
            </span>
            <span class="me-share-tile__label">SMS</span>
          </button>

          <button class="me-share-tile" @click="shareViaEmail">
            <span class="me-share-tile__icon" style="background:#0ea5e9">
              <v-icon size="22" color="white">mdi-email</v-icon>
            </span>
            <span class="me-share-tile__label">Email</span>
          </button>

          <button class="me-share-tile" @click="openQr">
            <span class="me-share-tile__icon" style="background:#0f172a">
              <v-icon size="22" color="white">mdi-qrcode</v-icon>
            </span>
            <span class="me-share-tile__label">Show QR</span>
          </button>

          <button class="me-share-tile" @click="copyLink">
            <span class="me-share-tile__icon" style="background:#6366f1">
              <v-icon size="22" color="white">{{ copied ? 'mdi-check' : 'mdi-link-variant' }}</v-icon>
            </span>
            <span class="me-share-tile__label">{{ copied ? 'Copied' : 'Copy link' }}</span>
          </button>

          <button v-if="canNativeShare" class="me-share-tile" @click="nativeShare">
            <span class="me-share-tile__icon" style="background:#475569">
              <v-icon size="22" color="white">mdi-share-variant</v-icon>
            </span>
            <span class="me-share-tile__label">More…</span>
          </button>
        </div>
      </v-card>
    </v-bottom-sheet>

    <!-- In-person QR sheet (customer scans this) -->
    <v-bottom-sheet v-model="qrOpen" inset>
      <v-card class="me-sheet me-sheet--qr" rounded="xl">
        <div class="me-sheet__handle" />
        <div class="me-sheet__head">
          <div>
            <div class="me-sheet__title">Scan to connect</div>
            <div class="me-sheet__sub">Hand your phone to your client</div>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="qrOpen = false" />
        </div>

        <div class="me-qr-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="Customer QR code" class="me-qr-img" />
          <v-progress-circular v-else indeterminate color="primary" />
        </div>
        <div class="me-qr-name">{{ data.profile.fullName }}</div>
        <div class="me-qr-url">{{ shortShareUrl }}</div>
      </v-card>
    </v-bottom-sheet>

    <!-- Side menu -->
    <v-navigation-drawer v-model="menuOpen" temporary location="end" width="300">
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-home"
          title="Home"
          @click="menuOpen = false"
        />
        <v-list-item
          prepend-icon="mdi-share-variant"
          title="Share my card"
          @click="menuOpen = false; openShare()"
        />
        <v-list-item
          prepend-icon="mdi-qrcode"
          title="Show QR for client"
          @click="menuOpen = false; openQr()"
        />
        <v-list-item
          prepend-icon="mdi-account-multiple"
          :title="`My contacts${pendingCount ? ` (${pendingCount} new)` : ''}`"
          @click="menuOpen = false; onContacts()"
        />
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-eye-outline"
          title="Preview customer view"
          :to="`/connect/${slug}`"
          target="_blank"
          @click="menuOpen = false"
        />
      </v-list>
    </v-navigation-drawer>

    <v-snackbar v-model="snack.show" :color="snack.color" location="top" :timeout="2400">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, onBeforeUnmount } from 'vue'
import { useRoute, useHead } from '#imports'
import { generateQrDataUrl } from '~/utils/qr'

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
const slug = computed(() => String(route.params.slug || '').toLowerCase())

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CardData | null>(null) as { value: CardData | null } & { value: any }
const qrDataUrl = ref<string | null>(null)
const pendingCount = ref(0)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })

const shareOpen = ref(false)
const qrOpen = ref(false)
const menuOpen = ref(false)
const copied = ref(false)
const activeTab = ref<'home' | 'contacts'>('home')

const cssVars = computed(() => {
  const c = data.value?.branding?.primaryColor || '#0F172A'
  return { '--me-primary': c } as Record<string, string>
})

// The link that gets shared with clients — the customer-facing card URL.
const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/connect/${slug.value}`
})

const shortShareUrl = computed(() => shareUrl.value.replace(/^https?:\/\//, ''))

const capturesUrl = '/admin/lead-generation?tab=instaconnect'

const socialLinks = computed<SocialLink[]>(() => data.value?.branding?.socialLinks || [])

const canNativeShare = computed(() => {
  if (typeof navigator === 'undefined') return false
  return typeof (navigator as any).share === 'function'
})

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function loadCard() {
  loading.value = true
  error.value = null
  try {
    data.value = await $fetch<CardData>(`/api/insta-connect/${slug.value}`)
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Card not available'
  } finally {
    loading.value = false
  }
}

async function rebuildQr() {
  if (!shareUrl.value) return
  qrDataUrl.value = null
  try {
    qrDataUrl.value = await generateQrDataUrl(shareUrl.value, {
      size: 720,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
  } catch (e) {
    console.error('QR generation failed', e)
  }
}

async function loadCaptures() {
  // Owner-only — silently no-op when the agent isn't signed in.
  if (!getAuthHeaders().Authorization) return
  try {
    const res: any = await $fetch('/api/admin/insta-connect/captures', {
      headers: getAuthHeaders(),
      query: { status: 'pending', limit: 1 },
    })
    pendingCount.value = res.counts?.pending || 0
  } catch {
    /* not the owner — ignore */
  }
}

function openShare() {
  shareOpen.value = true
}

function openQr() {
  shareOpen.value = false
  qrOpen.value = true
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    snack.color = 'error'
    snack.msg = 'Could not copy link'
    snack.show = true
  }
}

function shareViaSms() {
  const body = `Here's my card — ${shareUrl.value}`
  // iOS uses '&body=', Android historically prefers '?body='. Both forms are widely accepted.
  window.location.href = `sms:?&body=${encodeURIComponent(body)}`
}

function shareViaEmail() {
  const subject = `${data.value?.profile.fullName || 'My card'}`
  const body = `Hi,\n\nHere's my contact card: ${shareUrl.value}\n\nThanks,\n${data.value?.profile.firstName || ''}`
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

async function nativeShare() {
  if (!canNativeShare.value) return
  try {
    await (navigator as any).share({
      title: data.value?.profile.fullName || 'My card',
      text: `${data.value?.profile.fullName} — contact card`,
      url: shareUrl.value,
    })
  } catch { /* user cancelled */ }
}

function onHome() {
  activeTab.value = 'home'
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onContacts() {
  activeTab.value = 'contacts'
  // Deep-link to the admin contacts list. Requires the agent to be signed in.
  window.location.href = capturesUrl
}

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

function socialColor(s: SocialLink): string {
  const url = (s.url || '').toLowerCase()
  if (url.includes('instagram')) return '#e1306c'
  if (url.includes('facebook')) return '#1877f2'
  if (url.includes('linkedin')) return '#0a66c2'
  if (url.includes('youtube')) return '#ff0000'
  if (url.includes('whatsapp')) return '#25d366'
  return 'var(--me-primary)'
}

useHead(() => ({
  title: data.value?.profile.fullName ? `${data.value.profile.fullName} — My Card` : 'My Card',
  meta: [
    { name: 'theme-color', content: data.value?.branding?.primaryColor || '#0F172A' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: data.value?.profile.firstName || 'Card' },
  ],
  link: [
    // Manifest is intentionally only linked from /me — that's the install URL the agent
    // scans from the admin profile. The customer-facing /connect/<slug> page does not
    // expose the manifest, so customers are never prompted to install.
    { rel: 'manifest', href: `/api/insta-connect/${slug.value}/manifest` },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/deelbot-apple-touch-180.png' },
  ],
}))

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await loadCard()
  await rebuildQr()
  await loadCaptures()
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-instaconnect.js', { scope: '/connect/' })
    } catch (e) {
      console.warn('[InstaConnect] SW registration failed', e)
    }
  }
  pollInterval = setInterval(loadCaptures, 20000)
})

onBeforeUnmount(() => {
  if (pollInterval) clearInterval(pollInterval)
})

watch(slug, async () => {
  await loadCard()
  await rebuildQr()
  await loadCaptures()
})
</script>

<style scoped>
.me-loading,
.me-empty {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.me-shell {
  --me-primary: #0f172a;
  min-height: 100vh;
  background: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
  position: relative;
}

/* Top bar */
.me-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}
.me-topbar__brand { display: flex; align-items: center; gap: 8px; }
.me-topbar__logo { max-height: 36px; max-width: 140px; object-fit: contain; }
.me-topbar__fallback img { width: 30px; height: 30px; border-radius: 6px; }
.me-topbar__actions { display: flex; align-items: center; gap: 4px; }

/* Hero */
.me-main { padding: 0; }
.me-hero {
  position: relative;
  padding: 32px 18px 12px;
}
.me-hero__bg { position: absolute; inset: 0; overflow: hidden; }
.me-hero__cover {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.86);
}
.me-hero__cover--default {
  background:
    linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%),
    linear-gradient(135deg, #93c5fd 0%, #60a5fa 50%, #1d4ed8 100%);
  height: 100%;
}

.me-card {
  position: relative;
  z-index: 1;
  background: rgba(15, 23, 42, 0.94);
  color: #fff;
  border-radius: 22px;
  padding: 22px 22px 26px;
  text-align: center;
  box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.45);
  max-width: 360px;
  margin: 76px auto 18px;
  backdrop-filter: blur(8px);
}
.me-card__avatar {
  width: 132px; height: 132px;
  margin: -78px auto 14px;
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  border: 4px solid #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
}
.me-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
.me-card__name {
  font-size: 1.45rem; font-weight: 800; margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.me-card__role {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}
.me-card__company { font-weight: 700; margin-bottom: 8px; }
.me-card__line { font-size: 0.95rem; line-height: 1.6; }
.me-card__line a { color: #fff; text-decoration: none; }
.me-card__line--email a { font-size: 0.85rem; opacity: 0.92; }

.me-socials {
  position: relative; z-index: 1;
  display: flex; justify-content: center; gap: 14px;
  padding: 8px 0 6px;
}
.me-social {
  width: 44px; height: 44px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #fff;
  text-decoration: none;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
  border: 1px solid #f1f5f9;
}

/* Bottom dock */
.me-dock {
  position: fixed;
  left: 0; right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: end;
  background: #0f172a;
  color: #fff;
  padding: 10px 6px calc(10px + env(safe-area-inset-bottom));
  z-index: 5;
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.18);
}
.me-dock__btn {
  appearance: none;
  background: transparent;
  border: 0;
  color: rgba(255,255,255,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  cursor: pointer;
}
.me-dock__btn.is-active { color: #fff; }
.me-dock__btn.is-active::after {
  content: '';
  width: 4px; height: 4px;
  border-radius: 999px;
  background: #fff;
  margin-top: 2px;
}
.me-dock__btn--center {
  position: relative;
  transform: translateY(-22px);
}
.me-dock__center {
  width: 64px; height: 64px;
  border-radius: 18px;
  background: #0f172a;
  border: 4px solid #fff;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.4);
}
.me-dock__center-label {
  margin-top: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fff;
}
.me-dock__icon-wrap { position: relative; display: inline-flex; }
.me-dock__badge {
  position: absolute;
  top: -6px; right: -10px;
  background: #f59e0b;
  color: #0f172a;
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  border: 2px solid #0f172a;
  line-height: 1.1;
}

/* Bottom sheets */
.me-sheet {
  padding: 8px 18px 24px;
}
.me-sheet__handle {
  width: 40px; height: 4px;
  border-radius: 999px;
  background: #cbd5e1;
  margin: 8px auto 12px;
}
.me-sheet__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.me-sheet__title { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }
.me-sheet__sub { font-size: 0.78rem; color: #64748b; margin-top: 2px; }

.me-sheet__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 8px 0 16px;
}
@media (max-width: 380px) {
  .me-sheet__grid { grid-template-columns: repeat(3, 1fr); }
}

.me-share-tile {
  appearance: none; background: transparent; border: 0;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer;
  padding: 4px;
}
.me-share-tile__icon {
  width: 52px; height: 52px;
  border-radius: 16px;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.18);
}
.me-share-tile__label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
}

.me-sheet--qr { padding-bottom: 30px; }
.me-qr-wrap {
  display: flex; align-items: center; justify-content: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  margin: 4px 0 14px;
}
.me-qr-img {
  width: min(280px, 70vw);
  height: min(280px, 70vw);
  image-rendering: pixelated;
}
.me-qr-name {
  text-align: center;
  font-weight: 800;
  margin-top: 4px;
}
.me-qr-url {
  text-align: center;
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 4px;
  word-break: break-all;
}
</style>

<template>
  <div v-if="loading" class="me-loading">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else-if="error" class="me-empty">
    <v-icon size="56" color="grey-lighten-1">mdi-card-account-details-outline</v-icon>
    <h2 class="text-h6 mt-4 mb-1">Card not found</h2>
    <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 320px">
      This link may be inactive or the card was disabled.
    </p>
  </div>

  <div v-else class="me-shell" :style="cssVars">
    <header class="me-header">
      <div class="me-header__brand">
        <img src="/icons/deelbot-192.png" alt="DeelBot" />
        <span>DeelBot</span>
      </div>
      <v-btn
        icon="mdi-eye-outline"
        variant="text"
        density="comfortable"
        :to="`/connect/${slug}`"
        aria-label="Preview client view"
      />
    </header>

    <main class="me-main">
      <h1 class="me-title">Show this to your client</h1>
      <p class="me-sub">They scan it with their phone camera.</p>

      <div class="me-qr-card">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="me-qr" />
        <v-progress-circular v-else indeterminate color="primary" />
        <div class="me-qr-name">{{ data.profile.fullName }}</div>
        <div class="me-qr-url">{{ shortShareUrl }}</div>
      </div>

      <div class="me-actions">
        <v-btn
          color="primary"
          class="me-btn-primary"
          block
          size="large"
          prepend-icon="mdi-share-variant"
          @click="onShare"
        >
          Share my card
        </v-btn>

        <v-btn
          variant="outlined"
          block
          size="large"
          class="me-btn-secondary"
          prepend-icon="mdi-account-multiple"
          :href="capturesUrl"
        >
          View my contacts
          <v-chip
            v-if="pendingCount > 0"
            color="warning"
            size="small"
            class="ml-2"
            variant="flat"
          >
            {{ pendingCount }}
          </v-chip>
        </v-btn>
      </div>

      <section v-if="recentCaptures.length" class="me-recent">
        <div class="me-recent__head">
          <span>Recent contacts</span>
          <a :href="capturesUrl" class="me-recent__more">View all →</a>
        </div>
        <div
          v-for="c in recentCaptures"
          :key="c.id"
          class="me-recent__item"
        >
          <v-avatar size="40" color="primary" variant="tonal">
            <span class="text-caption font-weight-bold">{{ initials(c) }}</span>
          </v-avatar>
          <div class="me-recent__body">
            <div class="me-recent__name">{{ c.firstName }} {{ c.lastName }}</div>
            <div class="me-recent__meta">
              <span v-if="c.interest">{{ c.interest }} • </span>
              <span class="text-medium-emphasis">{{ relativeTime(c.createdAt) }}</span>
            </div>
          </div>
          <v-chip
            v-if="c.status === 'pending'"
            size="x-small"
            color="warning"
            variant="flat"
            class="font-weight-bold"
          >
            new
          </v-chip>
        </div>
      </section>
    </main>

    <v-snackbar v-model="snack.show" :color="snack.color" location="top" :timeout="2500">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, onBeforeUnmount } from 'vue'
import { useRoute, useHead } from '#imports'
import { generateQrDataUrl } from '~/utils/qr'

definePageMeta({ layout: false })

interface CardData {
  slug: string
  profile: {
    firstName: string
    lastName: string
    fullName: string
    email: string | null
    phone: string | null
    avatar: string | null
  }
  branding: { primaryColor: string }
}

interface Capture {
  id: number
  firstName: string
  lastName: string
  interest: string | null
  status: string
  createdAt: string
}

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase())

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CardData | null>(null) as { value: CardData | null } & { value: any }
const qrDataUrl = ref<string | null>(null)
const recentCaptures = ref<Capture[]>([])
const pendingCount = ref(0)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })

const cssVars = computed(() => {
  const c = data.value?.branding?.primaryColor || '#0F172A'
  return { '--me-primary': c } as Record<string, string>
})

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/connect/${slug.value}`
})

const shortShareUrl = computed(() => shareUrl.value.replace(/^https?:\/\//, ''))

const capturesUrl = '/admin/lead-generation?tab=instaconnect'

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
  // Owner-only fetch — silently no-op if not logged in.
  if (!getAuthHeaders().Authorization) return
  try {
    const res: any = await $fetch('/api/admin/insta-connect/captures', {
      headers: getAuthHeaders(),
      query: { status: 'all', limit: 5 },
    })
    recentCaptures.value = res.captures || []
    pendingCount.value = res.counts?.pending || 0
  } catch {
    /* not the owner — ignore */
  }
}

async function onShare() {
  const text = `${data.value?.profile.fullName} — ${shareUrl.value}`
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: data.value?.profile.fullName || 'Instacard',
        text,
        url: shareUrl.value,
      })
      return
    } catch { /* cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    snack.color = 'success'
    snack.msg = 'Link copied'
    snack.show = true
  } catch {
    snack.color = 'error'
    snack.msg = 'Could not share'
    snack.show = true
  }
}

function initials(c: Capture): string {
  return `${(c.firstName || '?')[0]}${(c.lastName || '')[0]}`.toUpperCase()
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

useHead(() => ({
  title: data.value?.profile.fullName ? `My QR — ${data.value.profile.fullName}` : 'My QR',
  meta: [
    { name: 'theme-color', content: data.value?.branding?.primaryColor || '#0F172A' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  ],
  link: [
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
  // Light polling so the agent sees new contacts arrive while the PWA is open.
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
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  padding-top: env(safe-area-inset-top);
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.me-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}
.me-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.me-header__brand img { width: 26px; height: 26px; border-radius: 6px; }

.me-main {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 18px 32px;
}
.me-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 4px 0 4px;
}
.me-sub {
  color: #64748b;
  font-size: 0.92rem;
  margin-bottom: 18px;
}
.me-qr-card {
  background: #fff;
  border-radius: 22px;
  padding: 22px 18px 18px;
  border: 1px solid #e2e8f0;
  text-align: center;
  box-shadow: 0 14px 40px -22px rgba(15, 23, 42, 0.18);
}
.me-qr {
  width: min(280px, 70vw);
  height: min(280px, 70vw);
  image-rendering: pixelated;
  display: block;
  margin: 0 auto 12px;
}
.me-qr-name {
  font-weight: 800;
  font-size: 1.05rem;
  margin-top: 8px;
}
.me-qr-url {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 4px;
  word-break: break-all;
}

.me-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.me-btn-primary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
}
.me-btn-secondary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
  border-color: #e2e8f0 !important;
  color: #0f172a !important;
}

.me-recent {
  margin-top: 28px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
}
.me-recent__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #475569;
  font-weight: 700;
}
.me-recent__more {
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.me-recent__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #f1f5f9;
}
.me-recent__body { flex: 1; min-width: 0; }
.me-recent__name { font-weight: 700; font-size: 0.95rem; }
.me-recent__meta { font-size: 0.78rem; color: #64748b; }
</style>

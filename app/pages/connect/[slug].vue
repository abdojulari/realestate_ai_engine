<template>
  <div v-if="loading" class="ic-loading">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else-if="error" class="ic-empty">
    <v-icon size="56" color="grey-lighten-1">mdi-card-account-details-outline</v-icon>
    <h2 class="text-h6 mt-4 mb-1">InstaConnect card not found</h2>
    <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 320px">
      This link may be inactive or the agent has disabled their card.
    </p>
  </div>

  <div v-else class="ic-shell" :style="cssVars">
    <!-- TOP BAR -->
    <header class="ic-topbar">
      <div class="ic-topbar__brand">
        <img v-if="data.branding.logoUrl" :src="data.branding.logoUrl" alt="logo" class="ic-topbar__logo" />
        <span v-else class="ic-topbar__brand-text">{{ data.profile.company || 'DeelBot' }}</span>
      </div>
      <div class="ic-topbar__right">
        <button class="ic-iconbtn" aria-label="Profile" @click="openContact = true">
          <v-icon size="22">mdi-account-circle-outline</v-icon>
        </button>
        <button class="ic-iconbtn" aria-label="Menu" @click="drawerOpen = true">
          <v-icon size="24">mdi-menu</v-icon>
        </button>
      </div>
    </header>

    <!-- HERO CARD -->
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
            <div class="ic-hero__role">{{ (data.profile.headline || 'Real Estate Agent').toUpperCase() }}</div>
            <div v-if="data.profile.company" class="ic-hero__company">{{ data.profile.company }}</div>
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

      <!-- INSTALL BANNER -->
      <section v-if="showInstallBanner" class="ic-install">
        <div class="ic-install__icon">
          <img src="/icons/deelbot-192.png" alt="DeelBot" />
        </div>
        <div class="ic-install__body">
          <div class="ic-install__title">Save {{ data.profile.firstName }} to your home screen</div>
          <div class="ic-install__sub">
            <template v-if="isIos">
              Tap <v-icon size="14" class="mx-1">mdi-export-variant</v-icon> then <strong>Add to Home Screen</strong>.
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
            class="ic-btn-primary"
            @click="onInstallClick"
          >
            Install
          </v-btn>
          <v-btn v-else variant="text" size="small" @click="dismissInstall">Dismiss</v-btn>
        </div>
      </section>
    </main>

    <!-- BOTTOM DOCK -->
    <nav class="ic-dock">
      <button class="ic-dock__item" @click="scrollTop">
        <v-icon size="22">mdi-home</v-icon>
        <span>Home</span>
      </button>

      <button class="ic-dock__share" :aria-label="'Share ' + data.profile.firstName" @click="openShare = true">
        <div class="ic-dock__share-orb">
          <v-icon size="32" color="white">mdi-qrcode</v-icon>
        </div>
        <span>Share</span>
      </button>

      <button class="ic-dock__item" @click="openContact = true">
        <v-icon size="22">mdi-account-multiple</v-icon>
        <span>Contacts</span>
      </button>
    </nav>

    <!-- TOP DRAWER (hamburger) -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="top"
      temporary
      class="ic-drawer"
      :scrim="true"
      style="height: auto"
    >
      <div class="ic-drawer__head">
        <button class="ic-drawer__btn" @click="closeDrawerThen(scrollTop)">
          <v-icon size="22">mdi-home</v-icon>
          <span>Home</span>
        </button>
        <button class="ic-drawer__btn" @click="closeDrawerThen(() => openShare = true)">
          <v-icon size="22">mdi-share-variant</v-icon>
          <span>Share</span>
        </button>
        <button class="ic-drawer__btn" @click="closeDrawerThen(() => openShare = true)">
          <v-icon size="22">mdi-qrcode</v-icon>
          <span>QR Code</span>
        </button>
        <button class="ic-drawer__btn" @click="drawerOpen = false">
          <v-icon size="22">mdi-close</v-icon>
        </button>
      </div>
      <v-divider />
      <v-list class="ic-drawer__list">
        <v-list-item
          prepend-icon="mdi-account-circle-outline"
          title="About Me"
          @click="closeDrawerThen(() => scrollToId('about'))"
        />
        <v-list-item
          prepend-icon="mdi-handshake-outline"
          title="Connect With Me"
          @click="closeDrawerThen(() => openContact = true)"
        />
        <v-list-item
          prepend-icon="mdi-email-outline"
          title="Contact Me"
          @click="closeDrawerThen(() => openContact = true)"
        />
      </v-list>
      <div class="ic-drawer__footer">
        <span class="ic-drawer__updates">Updates | Help</span>
        <div class="ic-drawer__brand">
          <span class="ic-drawer__brand-tag">FREE</span>
          <span class="ic-drawer__brand-name">INSTA<strong>CARD</strong></span>
          <span class="ic-drawer__brand-sub">a product by DeelBot</span>
        </div>
      </div>
    </v-navigation-drawer>

    <!-- ABOUT SECTION (anchor target for "About Me") -->
    <section v-if="data.profile.bio" id="about" class="ic-about">
      <h3 class="ic-about__title">About me</h3>
      <p class="ic-about__body">{{ data.profile.bio }}</p>
    </section>

    <!-- SHARE SHEET -->
    <v-bottom-sheet v-model="openShare" inset max-width="480" class="ic-sheet">
      <v-card class="ic-sheet__card">
        <div class="ic-sheet__header">
          <div class="ic-sheet__title-wrap">
            <span class="ic-sheet__title">Share Instacard</span>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="openShare = false" />
        </div>

        <div class="ic-sheet__qr-wrap">
          <button class="ic-sheet__download-link" @click="downloadQr">Download QR Code</button>
          <div class="ic-sheet__qr">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" />
            <v-progress-circular v-else indeterminate color="primary" />
          </div>
          <p class="ic-sheet__hint">Point your camera at the QR code to receive the Instacard</p>
        </div>

        <div class="ic-sheet__share-as-text">
          <v-btn class="ic-share-text-btn" rounded="pill" @click="shareAsText">
            Share as text
          </v-btn>
        </div>

        <div class="ic-sheet__actions">
          <button class="ic-sheet__action" @click="shareViaEmail">
            <v-icon size="22">mdi-email-outline</v-icon>
            <span>Email</span>
          </button>
          <button class="ic-sheet__action" @click="webShare">
            <v-icon size="22">mdi-export-variant</v-icon>
            <span>Share</span>
          </button>
          <button class="ic-sheet__action" @click="copyLink">
            <v-icon size="22">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
            <span>{{ copied ? 'Copied' : 'Copy Link' }}</span>
          </button>
        </div>
      </v-card>
    </v-bottom-sheet>

    <!-- CONTACT (capture) SHEET -->
    <v-bottom-sheet v-model="openContact" inset max-width="520" class="ic-sheet">
      <v-card class="ic-sheet__card">
        <div class="ic-sheet__header">
          <div class="ic-sheet__title-wrap">
            <span class="ic-sheet__overline">Connect with</span>
            <span class="ic-sheet__title">{{ data.profile.firstName }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="openContact = false" />
        </div>

        <v-card-text class="pt-2 pb-1">
          <v-form v-model="formValid" @submit.prevent="submitContact">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.firstName"
                  label="First name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.lastName"
                  label="Last name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.phone"
                  label="Phone"
                  variant="outlined"
                  density="comfortable"
                  type="tel"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  variant="outlined"
                  density="comfortable"
                  type="email"
                  :rules="emailRules"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.company"
                  label="Company (optional)"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="form.interest"
                  :items="interestOptions"
                  label="I'm interested in (optional)"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.message"
                  label="Message (optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  auto-grow
                />
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="form.consent"
                  density="compact"
                  hide-details
                  :rules="[(v: boolean) => v === true || 'Required']"
                >
                  <template #label>
                    <span class="text-body-2">
                      I agree to be contacted by {{ data.profile.firstName }} regarding my enquiry.
                    </span>
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 pb-4 pt-0 d-flex flex-column align-stretch ga-2">
          <v-btn
            color="primary"
            class="ic-btn-primary"
            :loading="submitting"
            :disabled="!formValid"
            block
            size="large"
            @click="submitContact"
          >
            Send my details
          </v-btn>
          <v-btn
            variant="outlined"
            block
            size="large"
            class="ic-btn-secondary"
            prepend-icon="mdi-account-plus"
            :href="vcardUrl"
            target="_blank"
          >
            Add {{ data.profile.firstName }} to my contacts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-bottom-sheet>

    <!-- THANK YOU -->
    <v-dialog v-model="showThanks" max-width="380">
      <v-card class="rounded-xl pa-6 text-center">
        <v-icon color="success" size="56">mdi-check-circle</v-icon>
        <h3 class="text-h6 mt-3 mb-1">You're connected!</h3>
        <p class="text-body-2 text-medium-emphasis mb-5">
          {{ thanksMessage || `Thanks — ${data.profile.firstName} will be in touch shortly.` }}
        </p>
        <v-btn
          color="primary"
          class="ic-btn-primary mb-2"
          block
          :href="vcardUrl"
          target="_blank"
        >
          Add to my contacts
        </v-btn>
        <v-btn variant="text" block @click="showThanks = false">Close</v-btn>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" location="top" :timeout="3000">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useHead } from '#imports'
import { generateQrDataUrl, downloadDataUrl } from '~/utils/qr'
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
const slug = computed(() => String(route.params.slug || '').toLowerCase())

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CardData | null>(null) as { value: CardData | null } & { value: any }

const drawerOpen = ref(false)
const openShare = ref(false)
const openContact = ref(false)
const showThanks = ref(false)
const thanksMessage = ref('')
const formValid = ref(false)
const submitting = ref(false)
const copied = ref(false)
const qrDataUrl = ref<string | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })
const installDismissed = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  interest: null as string | null,
  message: '',
  consent: false,
})

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email must be valid',
]

const interestOptions = [
  { title: 'Buying', value: 'buying' },
  { title: 'Selling', value: 'selling' },
  { title: 'Renting', value: 'renting' },
  { title: 'Just connecting', value: 'connecting' },
]

const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall()

const showInstallBanner = computed(() => {
  if (installDismissed.value) return false
  if (isStandalone.value) return false
  if (isIos.value) return true // iOS Safari needs manual instructions
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
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/connect/${slug.value}`
})

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

async function rebuildQr() {
  if (!shareUrl.value || !data.value) return
  qrDataUrl.value = null
  try {
    qrDataUrl.value = await generateQrDataUrl(shareUrl.value, {
      size: 640,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
  } catch (e) {
    console.error('QR generation failed', e)
  }
}

async function submitContact() {
  if (!formValid.value) return
  submitting.value = true
  try {
    const res: any = await $fetch(`/api/insta-connect/${slug.value}/capture`, {
      method: 'POST',
      body: { ...form },
    })
    thanksMessage.value = res?.message || ''
    openContact.value = false
    showThanks.value = true
    Object.assign(form, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      interest: null,
      message: '',
      consent: false,
    })
  } catch (e: any) {
    snack.color = 'error'
    snack.msg = e?.data?.statusMessage || e?.statusMessage || 'Could not send your details'
    snack.show = true
  } finally {
    submitting.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    snack.color = 'error'
    snack.msg = 'Could not copy link'
    snack.show = true
  }
}

async function webShare() {
  const text = `${data.value?.profile.fullName} — ${shareUrl.value}`
  if (navigator.share) {
    try {
      await navigator.share({ title: data.value?.profile.fullName, text, url: shareUrl.value })
      return
    } catch {
      /* user cancelled */
    }
  }
  await copyLink()
}

function shareViaEmail() {
  const subject = encodeURIComponent(`${data.value?.profile.fullName} — Instacard`)
  const body = encodeURIComponent(`Here's my Instacard:\n${shareUrl.value}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

function shareAsText() {
  const sms = encodeURIComponent(`${data.value?.profile.fullName} — ${shareUrl.value}`)
  window.location.href = `sms:?&body=${sms}`
}

function downloadQr() {
  if (!qrDataUrl.value) return
  downloadDataUrl(qrDataUrl.value, `${slug.value}-instaconnect.png`)
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

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeDrawerThen(fn: () => void) {
  drawerOpen.value = false
  setTimeout(fn, 150)
}

// Inject manifest, theme color, apple-touch-icon, and register the SW.
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
        ? `Connect with ${data.value.profile.fullName} — instaConnect digital business card by DeelBot.`
        : 'instaConnect digital business card by DeelBot.',
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
  if (data.value) await rebuildQr()
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-instaconnect.js', { scope: '/connect/' })
    } catch (e) {
      console.warn('[InstaConnect] SW registration failed', e)
    }
  }
  if (route.query.action === 'share') {
    openShare.value = true
  }
})

watch(slug, async () => {
  await loadCard()
  if (data.value) await rebuildQr()
})
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
  padding-bottom: 110px;
  position: relative;
}

/* TOP BAR */
.ic-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}
.ic-topbar__brand { display: flex; align-items: center; gap: 8px; }
.ic-topbar__logo { height: 28px; width: auto; }
.ic-topbar__brand-text { font-weight: 800; letter-spacing: -0.02em; }
.ic-topbar__right { display: flex; align-items: center; gap: 4px; }
.ic-iconbtn {
  width: 40px; height: 40px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #e2e8f0;
  cursor: pointer;
  color: #0f172a;
}
.ic-iconbtn + .ic-iconbtn { margin-left: 8px; }

/* HERO */
.ic-main { padding: 0 0 16px; }
.ic-hero {
  position: relative;
  padding: 24px 18px 8px;
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
  margin: 24px auto 18px;
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

/* INSTALL BANNER */
.ic-install {
  margin: 18px 14px 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
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

/* DOCK */
.ic-dock {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 18px;
  background: #0f172a;
  border-radius: 32px;
  padding: 8px 22px;
  z-index: 25;
  width: min(420px, calc(100% - 28px));
  box-shadow: 0 24px 60px -22px rgba(15, 23, 42, 0.45);
}
.ic-dock__item {
  background: transparent;
  border: 0;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 12px;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  cursor: pointer;
}
.ic-dock__share {
  background: transparent; border: 0; color: #fff;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 0.7rem; letter-spacing: 0.08em; font-weight: 700; cursor: pointer;
  margin-top: -34px;
}
.ic-dock__share-orb {
  width: 64px; height: 64px;
  border-radius: 999px;
  background: #0f172a;
  border: 4px solid #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 24px -8px rgba(15, 23, 42, 0.6);
}

/* DRAWER */
.ic-drawer__head {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 20px 12px 16px;
  gap: 4px;
}
.ic-drawer__btn {
  background: transparent; border: 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; cursor: pointer;
  font-size: 0.75rem; font-weight: 700; color: #0f172a;
}
.ic-drawer__list { padding: 4px 8px; }
.ic-drawer__footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 18px; gap: 8px;
  background: #f8fafc;
}
.ic-drawer__updates { font-size: 0.78rem; color: #475569; }
.ic-drawer__brand { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }
.ic-drawer__brand-tag {
  font-size: 0.55rem; letter-spacing: 0.08em;
  background: #f1f5f9; color: #334155; padding: 1px 6px;
  border-radius: 4px; align-self: flex-end; margin-bottom: 2px;
}
.ic-drawer__brand-name { font-weight: 800; font-size: 0.95rem; color: #b91c1c; letter-spacing: -0.02em; }
.ic-drawer__brand-name strong { color: #0f172a; }
.ic-drawer__brand-sub { font-size: 0.6rem; color: #94a3b8; }

/* SHEET */
.ic-sheet :deep(.v-overlay__content) { border-radius: 24px 24px 0 0; }
.ic-sheet__card { border-radius: 24px 24px 0 0 !important; padding-bottom: 18px; }
.ic-sheet__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 18px 6px;
}
.ic-sheet__title-wrap { display: flex; flex-direction: column; }
.ic-sheet__overline {
  font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: #64748b; font-weight: 700;
}
.ic-sheet__title { font-size: 1.2rem; font-weight: 800; }

.ic-sheet__qr-wrap {
  margin: 8px 18px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px;
  text-align: center;
}
.ic-sheet__download-link {
  background: transparent; border: 0;
  color: var(--ic-primary);
  font-weight: 700; font-size: 0.95rem;
  margin-bottom: 12px; cursor: pointer;
}
.ic-sheet__qr {
  display: flex; justify-content: center;
  min-height: 220px; align-items: center;
}
.ic-sheet__qr img { width: 220px; height: 220px; image-rendering: pixelated; }
.ic-sheet__hint { font-size: 0.85rem; color: #64748b; margin-top: 12px; }

.ic-sheet__share-as-text {
  display: flex; justify-content: center; padding: 4px 18px 14px;
}
.ic-share-text-btn {
  background: #0f172a !important;
  color: #fff !important;
  text-transform: none !important;
  font-weight: 700 !important;
  height: 44px !important;
  padding: 0 28px !important;
}

.ic-sheet__actions {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; padding: 0 18px;
}
.ic-sheet__action {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 14px 8px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 0.78rem; font-weight: 600; color: #0f172a;
}

/* Buttons */
.ic-btn-primary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
  letter-spacing: -0.01em !important;
}
.ic-btn-secondary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
  border-color: #e2e8f0 !important;
  color: #0f172a !important;
}

/* Mobile niceties */
@media (max-width: 360px) {
  .ic-hero__avatar { width: 116px; height: 116px; margin-top: -68px; }
  .ic-dock { gap: 12px; padding: 6px 16px; }
}
</style>

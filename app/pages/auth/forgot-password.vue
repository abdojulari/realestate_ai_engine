<template>
  <div class="forgot-container">
    <!-- Cinematic Sidebar (Left) — DeelBot promo so the page never feels empty -->
    <aside class="hero-sidebar d-none d-md-flex">
      <div class="parallax-container">
        <div class="parallax-bg" :style="{ backgroundImage: `url(${heroImages[currentImageIndex]})` }"></div>
        <div class="hero-overlay"></div>

        <div class="hero-content-wrapper pa-12">
          <div class="brand-badge mb-12 animate-fade-in">
            <img src="/images/logos/deelbot.png" alt="DeelBot" class="auth-logo-light" />
          </div>

          <div class="mt-auto">
            <transition name="slide-up" mode="out-in">
              <div :key="currentImageIndex">
                <h1 class="premium-display text-h2 text-white mb-6 leading-tight">
                  {{ heroContent[currentImageIndex]?.title }} <br/>
                  <span class="text-italic font-weight-light text-white opacity-80">
                    {{ heroContent[currentImageIndex]?.subtitle }}
                  </span>
                </h1>
              </div>
            </transition>

            <p class="text-h6 text-white opacity-70 font-weight-light leading-relaxed max-w-400">
              The intelligence layer behind Alberta's leading real estate brands. Powered by DeelBot.
            </p>

            <ul class="feature-list mt-10">
              <li v-for="(feat, i) in features" :key="i" class="feature-item">
                <span class="feature-bullet">
                  <v-icon size="14" color="white">{{ feat.icon }}</v-icon>
                </span>
                <div>
                  <div class="feature-title">{{ feat.title }}</div>
                  <div class="feature-sub">{{ feat.sub }}</div>
                </div>
              </li>
            </ul>
          </div>

          <div class="hero-footer mt-12 d-flex align-center justify-space-between">
            <a href="https://deelbot.com" target="_blank" rel="noopener" class="hero-link">
              <v-icon size="14" start>mdi-open-in-new</v-icon>
              Discover deelbot.com
            </a>
            <span class="text-caption text-white opacity-50">© {{ year }} DeelBot</span>
          </div>
        </div>

        <div class="carousel-indicators">
          <div
            v-for="(img, idx) in heroImages"
            :key="idx"
            class="indicator-dot"
            :class="{ active: idx === currentImageIndex }"
          ></div>
        </div>
      </div>
    </aside>

    <!-- Form Section (Right) -->
    <section class="form-section">
      <div class="form-inner-container">
        <div class="d-md-none text-center mb-10">
          <img src="/images/logos/deelbot.png" alt="DeelBot" class="auth-logo-mobile" />
        </div>

        <!-- Reset Form -->
        <template v-if="!emailSent">
          <div class="mb-10 text-center text-md-left">
            <span class="kicker">Account recovery</span>
            <h2 class="text-h4 font-weight-black tracking-tight mb-2 mt-2">Forgot your password?</h2>
            <p class="text-body-1 text-grey-darken-1 font-weight-light">
              Enter the email tied to your DeelBot account and we'll send you a secure link to choose a new one.
            </p>
          </div>

          <v-form @submit.prevent="handleSubmit">
            <div class="form-group mb-6">
              <label class="premium-label mb-2">Email Address</label>
              <v-text-field
                v-model="email"
                density="compact"
                type="email"
                required
                variant="underlined"
                placeholder="name@company.com"
                hide-details="auto"
                class="premium-input"
                color="black"
                autocomplete="email"
                :disabled="loading"
              />
            </div>

            <!-- Cloudflare Turnstile -->
            <div class="turnstile-wrapper mb-6">
              <p class="premium-label mb-2">Verify you're human</p>
              <div id="forgot-turnstile-container" class="cf-turnstile"></div>
              <p v-if="turnstileError" class="text-caption text-error mt-1">{{ turnstileError }}</p>
            </div>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-6 rounded-lg"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="black"
              block
              size="x-large"
              class="primary-btn mb-6 shadow-xl"
              rounded="pill"
              :loading="loading"
              :disabled="!email || !turnstileVerified || loading"
            >
              Send Reset Link
            </v-btn>
          </v-form>

          <div class="text-center pt-4 border-t">
            <NuxtLink to="/auth/login" class="back-link">
              <v-icon size="16" start>mdi-arrow-left</v-icon>
              Back to sign in
            </NuxtLink>
          </div>
        </template>

        <!-- Success State -->
        <template v-else>
          <div class="success-card text-center">
            <div class="success-icon">
              <v-icon size="40" color="white">mdi-email-check-outline</v-icon>
            </div>
            <h2 class="text-h4 font-weight-black tracking-tight mb-3">Check your inbox</h2>
            <p class="text-body-1 text-grey-darken-1 mb-6">
              If an account exists for <strong>{{ email }}</strong>, a password reset link is on its way.
              The link expires in <strong>30 minutes</strong>.
            </p>

            <v-alert
              type="info"
              variant="tonal"
              class="mb-6 text-left"
              icon="mdi-shield-lock-outline"
            >
              <strong>Didn't get it?</strong> Check your spam folder, or request a new link in a minute or two.
            </v-alert>

            <div class="d-flex flex-column gap-3">
              <v-btn
                variant="outlined"
                size="large"
                rounded="pill"
                @click="resetForm"
              >
                Try a different email
              </v-btn>
              <NuxtLink to="/auth/login" class="back-link mt-4">
                <v-icon size="16" start>mdi-arrow-left</v-icon>
                Back to sign in
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

declare const turnstile: any

definePageMeta({
  layout: 'auth',
  guestOnly: true,
})

const runtimeConfig = useRuntimeConfig()
const siteKey = (runtimeConfig.public.siteKey || '') as string

const { businessName } = useTenantSettings()

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const emailSent = ref(false)

const turnstileToken = ref<string | null>(null)
const turnstileVerified = ref(false)
const turnstileError = ref('')
const turnstileWidgetId = ref<string | null>(null)

const year = new Date().getFullYear()

const currentImageIndex = ref(0)
const heroImages = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687940-4e524cb35d07?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=2000&auto=format&fit=crop',
]

const heroContent = [
  { title: 'Recover Access.', subtitle: 'Securely.' },
  { title: 'Stay In', subtitle: 'Control.' },
  { title: 'Built On', subtitle: 'Trust.' },
]

const features = [
  { icon: 'mdi-shield-check-outline', title: 'Bank-grade security', sub: 'Single-use links, 30-minute expiry, hashed at rest.' },
  { icon: 'mdi-lightning-bolt-outline', title: 'AI-powered insights', sub: 'Real-time market valuations & lead scoring.' },
  { icon: 'mdi-handshake-outline', title: 'White-glove support', sub: 'Concierge onboarding for every brokerage.' },
]

let timer: any = null

const initTurnstile = () => {
  if (!siteKey) {
    turnstileError.value = 'Human verification is not configured (missing NUXT_PUBLIC_SITE_KEY).'
    return
  }
  if (typeof turnstile === 'undefined') {
    setTimeout(initTurnstile, 200)
    return
  }
  turnstileWidgetId.value = turnstile.render('#forgot-turnstile-container', {
    sitekey: siteKey,
    theme: 'light',
    callback: (token: string) => {
      turnstileToken.value = token
      turnstileVerified.value = true
      turnstileError.value = ''
    },
    'expired-callback': () => {
      turnstileToken.value = null
      turnstileVerified.value = false
      turnstileError.value = 'Verification expired. Please verify again.'
    },
    'error-callback': () => {
      turnstileError.value = 'Verification failed. Please try again.'
    },
  })
}

const resetTurnstile = () => {
  turnstileToken.value = null
  turnstileVerified.value = false
  if (siteKey && typeof turnstile !== 'undefined') {
    if (turnstileWidgetId.value) {
      try { turnstile.reset(turnstileWidgetId.value) } catch { turnstile.reset('#forgot-turnstile-container') }
    } else {
      turnstile.reset('#forgot-turnstile-container')
    }
  }
}

const handleSubmit = async () => {
  if (!turnstileToken.value) {
    turnstileError.value = 'Please complete the human verification challenge.'
    return
  }
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        turnstileToken: turnstileToken.value,
      },
    })
    emailSent.value = true
  } catch (error: any) {
    console.error('Password reset error:', error)
    const statusMessage = error?.data?.statusMessage || error?.statusMessage
    if (statusMessage) {
      if (statusMessage.includes('Human verification')) {
        errorMessage.value = 'Human verification failed. Please try again.'
      } else if (statusMessage.includes('Could not send')) {
        errorMessage.value = 'We could not send the email right now. Please try again shortly.'
      } else {
        errorMessage.value = statusMessage
      }
    } else {
      errorMessage.value = 'Failed to send reset link. Please try again.'
    }
    resetTurnstile()
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  emailSent.value = false
  errorMessage.value = ''
  resetTurnstile()
}

onMounted(() => {
  timer = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % heroImages.length
  }, 6000)
  if (process.client) initTurnstile()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

useHead({
  title: computed(() => `Forgot Password — ${businessName.value || 'DeelBot'}`),
  meta: [
    { name: 'description', content: 'Securely reset the password on your DeelBot account.' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600;800&display=swap');

.forgot-container {
  display: flex;
  min-height: 100vh;
  background: #ffffff;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* Hero sidebar */
.hero-sidebar {
  flex: 1.4;
  position: relative;
  overflow: hidden;
}

.parallax-container {
  position: absolute;
  inset: 0;
}

.parallax-bg {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out, transform 8s linear;
  animation: kenburns 20s infinite alternate;
}

@keyframes kenburns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.1) translate(-2%, -2%); }
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.92) 100%);
  z-index: 1;
}

.hero-content-wrapper {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  color: #fff;
}
.feature-bullet {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feature-title {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}
.feature-sub {
  color: rgba(255,255,255,0.65);
  font-size: 0.825rem;
  line-height: 1.5;
  margin-top: 2px;
}

.hero-link {
  color: rgba(255,255,255,0.85);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.hero-link:hover { color: #fff; }

.carousel-indicators {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 3;
}
.indicator-dot {
  width: 4px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.indicator-dot.active {
  background: #fff;
  height: 48px;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from { opacity: 0; transform: translateY(30px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-30px); }

/* Form Section */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  z-index: 2;
}
.form-inner-container {
  width: 100%;
  max-width: 440px;
}

.kicker {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #0f172a;
  background: #f1f5f9;
  padding: 6px 12px;
  border-radius: 999px;
}

.premium-display { font-family: 'Playfair Display', serif; }
.text-italic { font-style: italic; }

.premium-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748b;
}

.premium-input :deep(.v-field__input) {
  font-size: 1.1rem;
  padding-left: 0;
}

.primary-btn {
  font-weight: 800 !important;
  text-transform: none !important;
  transition: transform 0.3s, box-shadow 0.3s;
}
.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
}

.back-link {
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  font-size: 0.875rem;
}
.back-link:hover { color: #475569; text-decoration: underline; }

.success-card {
  padding: 8px 0;
}
.success-icon {
  width: 76px;
  height: 76px;
  border-radius: 999px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.35);
}

.auth-logo-light {
  height: 52px;
  width: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
}
.auth-logo-mobile {
  height: 48px;
  width: auto;
  object-fit: contain;
}

.turnstile-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.gap-3 { gap: 12px; }
.tracking-tight { letter-spacing: -0.02em; }

@media (max-width: 960px) {
  .form-section { padding: 30px; }
}
@media (max-width: 480px) {
  .form-section { padding: 24px 20px; }
}
</style>

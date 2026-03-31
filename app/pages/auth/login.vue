<template>
  <div class="login-container">
    <!-- Cinematic Parallax Hero Sidebar (Left) -->
    <div class="hero-sidebar d-none d-md-flex">
      <div class="parallax-container">
        <!-- Background Layer with Ken Burns / Parallax Effect -->
        <div class="parallax-bg" :style="{ backgroundImage: `url(${heroImages[currentImageIndex]})` }"></div>
        
        <!-- Overlay Gradient Layer -->
        <div class="hero-overlay"></div>

        <!-- Floating Glassmorphism Layer -->
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
              Access the private portal for Alberta's premier real estate valuation network.
            </p>
          </div>

          <div class="hero-footer mt-12 d-flex align-center gap-6">
            <div class="avatar-group d-flex">
              <v-avatar size="36" class="avatar-stack border-white border-2" v-for="i in 3" :key="i">
                <v-img :src="`https://i.pravatar.cc/100?img=${i+15}`" />
              </v-avatar>
            </div>
            <div class="d-flex flex-column">
              <span class="text-caption text-white opacity-60 font-weight-bold uppercase tracking-widest">Global Network</span>
              <span class="text-body-2 text-white font-weight-bold">Joined by 2.4k+ Professionals</span>
            </div>
          </div>
        </div>

        <!-- Animated Scroll/Slide Indicators -->
        <div class="carousel-indicators">
          <div 
            v-for="(img, idx) in heroImages" 
            :key="idx"
            class="indicator-dot"
            :class="{ active: idx === currentImageIndex }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Elegant Login Form Section (Right) -->
    <div class="form-section">
      <div class="form-inner-container">
        <!-- Logo for Mobile -->
        <div class="d-md-none text-center mb-12">
           <img src="/images/logos/deelbot.png" alt="DeelBot" class="auth-logo-mobile" />
        </div>

        <div class="mb-10 text-center text-md-left">
          <h2 class="text-h4 font-weight-black tracking-tight mb-2">Welcome Back</h2>
          <p class="text-body-1 text-grey-darken-1 font-weight-light">Please enter your credentials to access your dashboard.</p>
        </div>
        
        <!-- Login Form -->
        <v-form @submit.prevent="handleSubmit">
          <div class="form-group mb-5">
            <label class="premium-label mb-2">Email Address</label>
            <v-text-field density="compact"
              v-model="email"
              type="email"
              required
              variant="underlined"
              placeholder="name@company.com"
              hide-details="auto"
              class="premium-input"
              color="black"
            />
          </div>

          <div class="form-group mb-5">
            <div class="d-flex justify-space-between align-center mb-2">
              <label class="premium-label">Password</label>
              <NuxtLink to="/auth/forgot-password" class="forgot-link text-caption font-weight-bold text-uppercase">
                Forgot?
              </NuxtLink>
            </div>
            <v-text-field density="compact"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              variant="underlined"
              placeholder="••••••••"
              hide-details="auto"
              class="premium-input"
              color="black"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showPassword = !showPassword"
            />
          </div>

          <div class="d-flex align-center mb-8">
            <v-checkbox
              v-model="rememberMe"
              label="Keep me signed in"
              density="compact"
              hide-details
              color="black"
              class="custom-checkbox"
            />
          </div>

          <!-- Error Message Display -->
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
            class="login-btn mb-8 shadow-xl"
            rounded="pill"
            :loading="loading"
            :disabled="!email || !password || loading"
          >
            Sign In
          </v-btn>
        </v-form>

        <!-- Social Login Divider -->
        <div class="divider-container mb-8">
          <span class="divider-text">Or continue with</span>
        </div>

        <!-- Social Login Grid -->
        <v-row dense class="mb-10">
          <v-col cols="6">
            <v-btn
              variant="outlined"
              block
              size="large"
              class="social-btn rounded-xl"
              @click="loginWithGoogle"
              :loading="googleLoading"
            >
              <v-icon start size="20">mdi-google</v-icon>
              Google
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              variant="outlined"
              block
              size="large"
              class="social-btn rounded-xl"
              @click="loginWithFacebook"
              :loading="facebookLoading"
            >
              <v-icon start size="20" color="#1877F2">mdi-facebook</v-icon>
              Facebook
            </v-btn>
          </v-col>
        </v-row>

        <!-- Sign Up Footer -->
        <div class="text-center pt-4 border-t">
          <span class="text-body-2 text-grey-darken-1">New to the platform?</span>
          <NuxtLink to="/auth/register" class="signup-link-btn ml-2 font-weight-bold text-black text-decoration-none">
            Join Abdul Ojulari's Network
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

// UI State
const currentImageIndex = ref(0)
const heroImages = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687940-4e524cb35d07?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=2000&auto=format&fit=crop'
]

const heroContent = [
  { title: 'Precision', subtitle: 'Intelligence.' },
  { title: 'Market', subtitle: 'Excellence.' },
  { title: 'Boutique', subtitle: 'Experience.' }
]

let timer: any = null

// Functional logic
const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)
const googleLoading = ref(false)
const facebookLoading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await authStore.login(email.value, password.value)
    
    // Check if 2FA is required
    if (result && typeof result === 'object' && 'requiresTwoFactor' in result && result.requiresTwoFactor) {
      // Store email and password temporarily for 2FA verification
      if (process.client) {
        sessionStorage.setItem('2fa_email', email.value)
        sessionStorage.setItem('2fa_password', password.value)
      }
      // Redirect to 2FA verification page
      await router.push('/auth/verify-2fa')
      return
    }
    
    // Check for redirect parameter or stored redirect path
    const route = useRoute()
    const redirectTo = route.query.redirect as string || localStorage.getItem('redirectAfterLogin') || '/'
    // Clear stored redirect
    if (localStorage.getItem('redirectAfterLogin')) {
      localStorage.removeItem('redirectAfterLogin')
    }
    router.push(redirectTo)
  } catch (error: any) {
    console.error('Login error:', error)
    // Extract user-friendly error message
    let message = 'Login failed. Please try again.'
    if (error?.data?.statusMessage || error?.statusMessage) {
      const statusMessage = error.data?.statusMessage || error.statusMessage
      if (statusMessage.includes('Invalid credentials') || statusMessage.includes('Unauthorized')) {
        message = 'Invalid email or password. Please check your credentials and try again.'
      } else if (statusMessage.includes('User not found')) {
        message = 'No account found with this email address.'
      } else if (statusMessage.includes('Account locked')) {
        message = 'Your account has been locked. Please contact support.'
      } else {
        message = statusMessage
      }
    } else if (error?.message) {
      if (error.message.includes('Invalid credentials')) {
        message = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        message = 'Connection error. Please check your internet connection and try again.'
      }
    }
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

const loginWithGoogle = async () => {
  googleLoading.value = true
  try {
    window.location.href = '/api/auth/google'
  } finally {
    // let redirect occur
    googleLoading.value = false
  }
}

const { initFacebookSDK, login: fbLogin, userAccessToken: fbToken } = useFacebookAuth()

const loginWithFacebook = async () => {
  facebookLoading.value = true
  errorMessage.value = ''
  try {
    await initFacebookSDK()
    await fbLogin()

    if (!fbToken.value) {
      errorMessage.value = 'Facebook login failed. No access token returned.'
      return
    }

    const res = await $fetch('/api/auth/facebook/callback', {
      method: 'POST',
      body: { accessToken: fbToken.value }
    }) as any

    if (res.token) {
      authStore.setToken(res.token)
      await authStore.checkAuth()
      const route = useRoute()
      const redirectTo = route.query.redirect as string || localStorage.getItem('redirectAfterLogin') || '/'
      localStorage.removeItem('redirectAfterLogin')
      router.push(redirectTo)
    }
  } catch (e: any) {
    errorMessage.value = e.data?.statusMessage || e.message || 'Facebook login failed. Please try again.'
  } finally {
    facebookLoading.value = false
  }
}

// Define page meta to redirect authenticated users
definePageMeta({
  layout: 'default',
  guestOnly: true
})

// Consolidated onMounted hook
onMounted(async () => {
  // Start hero image carousel
  timer = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % heroImages.length
  }, 6000)
  
  // Auto-consume token from Google callback and handle OAuth
  if (process.client && typeof window !== 'undefined') {
    // First check if user is already authenticated
    if (authStore.isAuthenticated) {
      const route = useRoute()
      const redirectTo = route.query.redirect as string || '/'
      router.push(redirectTo)
      return
    }
    const hash = window.location.hash || ''
    const m = hash.match(/token=([^&]+)/)
    if (m && m[1]) {
      try {
        const token = decodeURIComponent(m[1])
        authStore.setToken(token)
        await authStore.checkAuth()
        // Clean the hash from URL
        history.replaceState(null, '', '/auth/login')
        const redirect = localStorage.getItem('redirectAfterLogin')
        if (redirect) {
          localStorage.removeItem('redirectAfterLogin')
          router.push(redirect)
        } else {
          router.push('/')
        }
      } catch (e) {
        console.error('OAuth token handling failed:', e)
      }
    }
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600;800&display=swap');

.login-container {
  display: flex;
  min-height: 100vh;
  background: #ffffff;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* --- Parallax & Hero Sidebar --- */
.hero-sidebar {
  flex: 1.4; /* Slightly wider for cinematic feel */
  position: relative;
  overflow: hidden;
}

.parallax-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg, 
    rgba(15, 23, 42, 0.45) 0%, 
    rgba(15, 23, 42, 0.9) 100%
  );
  z-index: 1;
}

.hero-content-wrapper {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* --- Hero UI Elements --- */
.avatar-stack {
  margin-left: -12px;
  transition: transform 0.3s;
}
.avatar-stack:first-child { margin-left: 0; }
.avatar-group:hover .avatar-stack { transform: translateX(4px); }

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

/* --- Transitions --- */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from { opacity: 0; transform: translateY(30px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-30px); }

/* --- Form Section --- */
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

.premium-display {
  font-family: 'Playfair Display', serif;
}

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

.login-btn {
  font-weight: 800 !important;
  text-transform: none !important;
  transition: transform 0.3s, box-shadow 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
}

.divider-container {
  text-align: center;
  position: relative;
  border-bottom: 1px solid #f1f5f9;
  line-height: 0.1em;
}

.divider-text {
  background: #fff;
  padding: 0 15px;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 500;
}

.social-btn {
  text-transform: none !important;
  font-weight: 600 !important;
  transition: all 0.2s;
}

.social-btn:hover {
  background-color: #f8fafc !important;
  border-color: #000 !important;
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

.gap-6 { gap: 24px; }
.tracking-tighter { letter-spacing: -0.05em; }

@media (max-width: 960px) {
  .form-section { padding: 30px; }
}
</style>
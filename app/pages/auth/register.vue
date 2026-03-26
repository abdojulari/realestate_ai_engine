<template>
  <div class="signup-container">
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
            <NuxtLink to="/" class="text-decoration-none">
              <img src="/images/logos/deelbot.png" alt="DeelBot" class="auth-logo-light" />
            </NuxtLink>
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
              Join Alberta's most exclusive network of real estate professionals and valuation experts.
            </p>
          </div>

          <div class="hero-footer mt-12 d-flex align-center gap-6">
            <div class="avatar-group d-flex">
              <v-avatar size="36" class="avatar-stack border-white border-2" v-for="i in 3" :key="i">
                <v-img :src="`https://i.pravatar.cc/100?img=${i+10}`" />
              </v-avatar>
            </div>
            <div class="d-flex flex-column">
              <span class="text-caption text-white opacity-60 font-weight-bold uppercase tracking-widest">Growth Focused</span>
              <span class="text-body-2 text-white font-weight-bold">Starting your journey today</span>
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

    <!-- Elegant Signup Form Section (Right) -->
    <div class="form-section">
      <div class="form-inner-container">
        <!-- Logo for Mobile -->
        <div class="d-md-none text-center mb-12">
           <img src="/images/logos/deelbot.png" alt="DeelBot" class="auth-logo-mobile" />
        </div>

        <div class="mb-8 text-center text-md-left">
          <h2 class="text-h4 font-weight-black tracking-tight mb-2">Create Account</h2>
          <p class="text-body-1 text-grey-darken-1 font-weight-light">Enter your details to join the network.</p>
        </div>
        
        <v-form @submit.prevent="handleSubmit" v-model="isFormValid">
          <!-- Error Alert -->
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-6 rounded-lg"
          >
            {{ formError }}
            <template v-if="showLoginHint">
              <NuxtLink to="/auth/login" class="text-black font-weight-bold text-decoration-none ml-1 underline">
                Proceed to login
              </NuxtLink>
            </template>
          </v-alert>

          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="form-group mb-4">
                <label class="premium-label mb-1">First Name</label>
                <v-text-field density="compact"
                  v-model="firstName"
                  :rules="nameRules"
                  variant="underlined"
                  placeholder="John"
                  hide-details="auto"
                  color="black"
                  class="premium-input"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="form-group mb-4">
                <label class="premium-label mb-1">Last Name</label>
                <v-text-field density="compact"
                  v-model="lastName"
                  :rules="nameRules"
                  variant="underlined"
                  placeholder="Doe"
                  hide-details="auto"
                  color="black"
                  class="premium-input"
                />
              </div>
            </v-col>
          </v-row>

          <div class="form-group mb-4">
            <label class="premium-label mb-1">Email Address</label>
            <v-text-field density="compact"
              v-model="email"
              type="email"
              :rules="emailRules"
              variant="underlined"
              placeholder="john@example.com"
              hide-details="auto"
              color="black"
              class="premium-input"
            />
          </div>

          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="form-group mb-4">
                <label class="premium-label mb-1">Phone</label>
                <v-text-field density="compact"
                  v-model="phone"
                  type="tel"
                  :rules="phoneRules"
                  variant="underlined"
                  placeholder="403-000-0000"
                  hide-details="auto"
                  color="black"
                  class="premium-input"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="form-group mb-4">
                <label class="premium-label mb-1">Preferred Time</label>
                <v-select density="compact"
                  v-model="preferredContactTime"
                  :items="contactTimeOptions"
                  variant="underlined"
                  hide-details="auto"
                  color="black"
                  class="premium-input"
                />
              </div>
            </v-col>
          </v-row>

          <div class="form-group mb-4">
            <label class="premium-label mb-1">Password</label>
            <v-text-field density="compact"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :rules="passwordRules"
              variant="underlined"
              placeholder="••••••••"
              hide-details="auto"
              color="black"
              class="premium-input"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showPassword = !showPassword"
            />
          </div>

          <div class="form-group mb-6">
            <label class="premium-label mb-1">Confirm Password</label>
            <v-text-field density="compact"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="[...passwordRules, (v) => v === password || 'Passwords must match']"
              variant="underlined"
              placeholder="••••••••"
              hide-details="auto"
              color="black"
              class="premium-input"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
            />
          </div>

          <v-checkbox
            v-model="agreeToTerms"
            class="custom-checkbox mb-6"
            density="compact"
            hide-details
            color="black"
          >
            <template v-slot:label>
              <span class="text-caption">
                I agree to the <NuxtLink to="/terms" class="text-black font-weight-bold">Terms</NuxtLink> 
                and <NuxtLink to="/privacy" class="text-black font-weight-bold">Privacy Policy</NuxtLink>
              </span>
            </template>
          </v-checkbox>

          <v-btn
            type="submit"
            color="black"
            block
            size="x-large"
            class="login-btn mb-8 shadow-xl"
            rounded="pill"
            :loading="loading"
            :disabled="!isFormValid || !agreeToTerms || loading"
          >
            Create My Account
          </v-btn>
        </v-form>

        <!-- Sign In Footer -->
        <div class="text-center pt-6 border-t">
          <span class="text-body-2 text-grey-darken-1">Already part of the network?</span>
          <NuxtLink to="/auth/login" class="signup-link-btn ml-2 font-weight-bold text-black text-decoration-none underline-hover">
            Sign In Here
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// --- Hero / UI Logic ---
const currentImageIndex = ref(0)
const heroImages = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2000&auto=format&fit=crop'
]

const heroContent = [
  { title: 'Exclusive', subtitle: 'Opportunities.' },
  { title: 'Collaborative', subtitle: 'Network.' },
  { title: 'Data-Driven', subtitle: 'Decisions.' }
]

let timer: any = null
onMounted(() => {
  timer = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % heroImages.length
  }, 6000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

// --- Form Logic ---
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const preferredContactTime = ref('Any Time')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreeToTerms = ref(false)
const loading = ref(false)
const isFormValid = ref(false)
const formError = ref<string | null>(null)
const showLoginHint = ref(false)

const contactTimeOptions = [
  'Morning (9AM - 12PM)',
  'Afternoon (12PM - 5PM)',
  'Evening (5PM - 8PM)',
  'Any Time'
]

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters',
  (v: string) => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
  (v: string) => /[a-z]/.test(v) || 'Password must contain at least one lowercase letter',
  (v: string) => /[0-9]/.test(v) || 'Password must contain at least one number'
]

const handleSubmit = async () => {
  loading.value = true
  formError.value = null
  showLoginHint.value = false
  try {
    await auth.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
      phone: phone.value,
      preferredContactTime: preferredContactTime.value
    })
    
    // Registration successful, redirect to home
    router.push('/')
  } catch (error) {
    const err: any = error
    const status = err?.status || err?.statusCode || err?.response?.status
    const statusMessage = err?.statusMessage || err?.data?.statusMessage || err?.response?._data?.statusMessage || err?.message
    if (status === 400 && /exists/i.test(String(statusMessage || ''))) {
      formError.value = 'You have an account already! Please proceed to login'
      showLoginHint.value = true
    } else {
      formError.value = 'Registration failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600;800&display=swap');

.signup-container {
  display: flex;
  min-height: 100vh;
  background: #ffffff;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* --- Hero Sidebar Logic --- */
.hero-sidebar {
  flex: 1.2;
  position: relative;
  overflow: hidden;
}

.parallax-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

.parallax-bg {
  position: absolute;
  top: -10%; left: -10%;
  width: 120%; height: 120%;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out;
  animation: kenburns 20s infinite alternate;
}

@keyframes kenburns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.1) translate(-2%, -2%); }
}

.hero-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%);
  z-index: 1;
}

.hero-content-wrapper {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* --- Form Section Styling --- */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
}

.form-inner-container {
  width: 100%;
  max-width: 500px;
}

.premium-display { font-family: 'Playfair Display', serif; }
.text-italic { font-style: italic; }

.premium-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.premium-input :deep(.v-field__input) {
  font-size: 1rem;
  padding-left: 0;
}

.login-btn {
  font-weight: 800 !important;
  text-transform: none !important;
}

.carousel-indicators {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 3;
}

.indicator-dot {
  width: 3px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: all 0.6s ease;
}

.indicator-dot.active {
  background: #fff;
  height: 40px;
}

/* --- Transitions --- */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-20px); }

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

.underline-hover:hover { text-decoration: underline !important; }

@media (max-width: 600px) {
  .form-section { padding: 24px; }
}
</style>
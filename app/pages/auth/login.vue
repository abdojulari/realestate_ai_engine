<template>
  <div class="login-container">
    <!-- Hero Section -->
    <div class="d-none d-md-flex">
      <v-img height="100%" min-height="440" cover src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1920&auto=format&fit=crop" referrerpolicy="no-referrer">
          <div class="d-flex flex-column text-white align-center justify-center h-100 pa-6" style="background: linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.45) 100%);">
            <h1 class="hero-title">Manage Properties Efficiently</h1>
            <p class="hero-subtitle">
              Real estate professionals like you rely on property<br>
              management systems to efficiently manage properties
            </p>
          </div>
        </v-img>
    </div>

    <!-- Login Form Section -->
    <div class="form-section">
      <div class="form-container">
        
        <!-- Login Form -->
        <v-form @submit.prevent="handleSubmit">
          <div class="form-group mb-6">
            <label class="form-label">Your email</label>
            <v-text-field
              v-model="email"
              type="email"
              required
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-text-field"
            />
          </div>

          <div class="form-group mb-6">
            <label class="form-label">Password</label>
            <v-text-field
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="custom-text-field"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
            />
          </div>

          <div class="d-flex justify-space-between align-center mb-6">
            <v-checkbox
              v-model="rememberMe"
              label="Remember me"
              density="compact"
              hide-details
            />
            <NuxtLink to="/auth/forgot-password" class="forgot-link">
              Forgot password?
            </NuxtLink>
          </div>

          <!-- Error Message Display -->
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="errorMessage = ''"
          >
            {{ errorMessage }}
          </v-alert>

          <v-btn
            type="submit"
            color="grey-darken-1"
            block
            size="large"
            class="login-btn mb-10"
            :loading="loading"
            :disabled="!email || !password || loading"
          >
            Login
          </v-btn>
        </v-form>

        <!-- Social Login -->
        <div class="social-login">
          <v-btn
            variant="outlined"
            color="red"
            block
            size="large"
            class="social-btn mb-3"
            @click="loginWithGoogle"
            :loading="googleLoading"
          >
            <v-icon start>mdi-google</v-icon>
            Sign in with Google
          </v-btn>

          <v-btn
            variant="outlined"
            block
            size="large"
            class="social-btn mb-6"
            @click="loginWithApple"
            :loading="appleLoading"
          >
            <v-icon start>mdi-apple</v-icon>
            Sign in with Apple
          </v-btn>
        </div>

        <!-- Sign Up Link -->
        <div class="signup-link">
          <span class="signup-text">Don't have an account?</span>
          <NuxtLink to="/auth/register" class="signup-link-btn">
            Sign up here!
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Ensure composable is in scope
import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth'
// Nuxt 4: useRouter, ref auto-imports available
const auth = useAuth()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)
const googleLoading = ref(false)
const facebookLoading = ref(false)
const appleLoading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    await auth.login({ email: email.value, password: password.value })
    router.push('/')
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

const loginWithFacebook = async () => {
  facebookLoading.value = true
  try {
    // Not implemented yet
  } finally {
    facebookLoading.value = false
  }
}

const loginWithApple = async () => {
  appleLoading.value = true
  try {
    // Apple login implementation would go here
    // For now, redirecting to a future Apple OAuth endpoint
    window.location.href = '/api/auth/apple'
  } finally {
    appleLoading.value = false
  }
}

// Auto-consume token from Google callback: /auth/login#token=...
onMounted(async () => {
  if (process.client && typeof window !== 'undefined') {
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
</script>

<style scoped>
.login-container {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.hero-section {
  flex: 1;
  background-image: linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(29, 78, 216, 0.8)), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect fill="%23e2e8f0" width="1200" height="800"/><rect fill="%239ca3af" x="50" y="100" width="300" height="200" rx="20"/><rect fill="%236b7280" x="400" y="80" width="250" height="240" rx="15"/><rect fill="%239ca3af" x="700" y="120" width="200" height="180" rx="18"/><rect fill="%236b7280" x="950" y="90" width="180" height="220" rx="12"/></svg>');
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-overlay {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.9));
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.hero-content {
  text-align: center;
  color: white;
  max-width: 500px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 24px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.125rem;
  line-height: 1.6;
  opacity: 0.95;
}

.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: white;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.welcome-header {
  text-align: center;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

:deep(.custom-text-field .v-field) {
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

:deep(.custom-text-field .v-field:hover) {
  border-color: #d1d5db;
}

:deep(.custom-text-field .v-field--focused) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:deep(.custom-text-field .v-field__input) {
  padding: 12px 16px;
  font-size: 1rem;
}

.forgot-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.forgot-link:hover {
  color: #2563eb;
  text-decoration: underline;
}

.login-btn {
  border-radius: 12px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  font-size: 1rem !important;
  padding: 12px 0 !important;
  background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
}

.social-login {
  position: relative;
}

.social-login::before {
  content: '';
  position: absolute;
  top: -24px;
  left: 0;
  right: 0;
  height: 1px;
  background: #e5e7eb;
}

.social-login::after {
  content: 'or';
  position: absolute;
  top: -36px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 16px;
  font-size: 0.875rem;
  color: #6b7280;
}

.social-btn {
  border-radius: 12px !important;
  border: 1px solid #e5e7eb !important;
  font-weight: 500 !important;
  text-transform: none !important;
  color: #374151 !important;
}

.social-btn:hover {
  border-color: #d1d5db !important;
  background: #f9fafb !important;
}

.signup-link {
  text-align: center;
  font-size: 0.875rem;
}

.signup-text {
  color: #6b7280;
}

.signup-link-btn {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
}

.signup-link-btn:hover {
  color: #2563eb;
  text-decoration: underline;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
  }
  
  .hero-section {
    display: none !important;
  }
  
  .form-section {
    padding: 24px;
  }
  
  .form-container {
    max-width: none;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .welcome-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 16px;
  }
  
  .welcome-title {
    font-size: 1.5rem;
  }
}
</style>

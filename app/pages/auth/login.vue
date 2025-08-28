<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4">
          <v-card-title class="text-center text-h4 mb-4">
            Sign In
          </v-card-title>

          <v-form @submit.prevent="handleSubmit" v-model="isFormValid">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              :rules="emailRules"
              required
              variant="outlined"
              prepend-inner-icon="mdi-email"
            />

            <v-text-field
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              :rules="passwordRules"
              required
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
            />

            <!-- Error Message Display -->
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mt-4"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              block
              class="mt-4"
              :loading="loading"
              :disabled="!isFormValid"
            >
              Sign In
            </v-btn>
          </v-form>

          <v-divider class="my-4" />

          <div class="text-center mb-4">
            <span class="text-body-2">Or sign in with</span>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              color="#DB4437"
              block
              @click="loginWithGoogle"
              prepend-icon="mdi-google"
              :loading="googleLoading"
            >
              Google
            </v-btn>

            <v-btn
              color="#4267B2"
              block
              @click="loginWithFacebook"
              prepend-icon="mdi-facebook"
              :loading="facebookLoading"
            >
              Facebook
            </v-btn>
          </div>

          <div class="text-center mt-4">
            <span class="text-body-2">Don't have an account?</span>
            <NuxtLink to="/auth/register" class="text-primary text-decoration-none ml-2">
              Sign Up
            </NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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
const loading = ref(false)
const googleLoading = ref(false)
const facebookLoading = ref(false)
const isFormValid = ref(false)
const errorMessage = ref('')

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 6 || 'Password must be at least 6 characters'
]

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

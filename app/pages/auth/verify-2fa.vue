<template>
  <div class="verify-2fa-container">
    <!-- Cinematic Hero Sidebar (Left) -->
    <div class="hero-sidebar d-none d-md-flex">
      <div class="parallax-container">
        <div class="parallax-bg" style="background-image: url('https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2000&auto=format&fit=crop')"></div>
        <div class="hero-overlay"></div>
        
        <div class="hero-content-wrapper pa-12">
          <div class="brand-badge mb-12">
            <span class="text-h4 font-weight-black tracking-tighter text-white">AO<span class="text-primary">.</span></span>
          </div>
          
          <div class="mt-auto">
            <h1 class="text-h2 text-white mb-6 leading-tight">
              Enhanced Security<br/>
              <span class="text-italic font-weight-light opacity-80">Protection Enabled.</span>
            </h1>
            <p class="text-h6 text-white opacity-70 font-weight-light leading-relaxed max-w-400">
              Two-factor authentication ensures your account remains secure.
            </p>
          </div>

          <div class="hero-footer mt-12">
            <v-icon size="64" color="white" class="opacity-50">mdi-shield-lock</v-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 2FA Verification Form Section (Right) -->
    <div class="form-section">
      <div class="form-inner-container">
        <!-- Logo for Mobile -->
        <div class="d-md-none text-center mb-12">
          <span class="text-h4 font-weight-black tracking-tighter text-black">AO<span class="text-primary">.</span></span>
        </div>

        <!-- Header -->
        <div class="text-center mb-10">
          <div class="security-icon-wrapper mx-auto mb-6">
            <v-icon size="48" color="primary">mdi-shield-lock</v-icon>
          </div>
          <h2 class="text-h4 font-weight-black tracking-tight mb-2">Verify Your Identity</h2>
          <p class="text-body-1 text-grey-darken-1 font-weight-light">
            We've sent a 6-digit code to<br/>
            <strong>{{ maskedEmail }}</strong>
          </p>
        </div>

        <!-- 2FA Code Input -->
        <v-form @submit.prevent="handleVerify">
          <div class="form-group mb-8">
            <label class="premium-label mb-3 text-center d-block">Enter Verification Code</label>
            <div class="code-input-container">
              <input
                v-for="(digit, index) in code"
                :key="index"
                :ref="el => codeInputs[index] = el"
                v-model="code[index]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                class="code-input"
                :autofocus="index === 0"
                @input="handleInput(index, $event)"
                @keydown="handleKeyDown(index, $event)"
                @paste="handlePaste"
              />
            </div>
          </div>

          <!-- Error Message -->
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

          <!-- Success Message -->
          <v-alert
            v-if="successMessage"
            type="success"
            variant="tonal"
            class="mb-6 rounded-lg"
          >
            {{ successMessage }}
          </v-alert>

          <!-- Verify Button -->
          <v-btn
            type="submit"
            color="black"
            block
            size="x-large"
            class="login-btn mb-6 shadow-xl"
            rounded="pill"
            :loading="verifying"
            :disabled="!isCodeComplete || verifying"
          >
            Verify & Sign In
          </v-btn>

          <!-- Resend Code -->
          <div class="text-center">
            <p class="text-body-2 text-grey-darken-1 mb-2">
              Didn't receive the code?
            </p>
            <v-btn
              variant="text"
              class="text-black font-weight-bold"
              :disabled="resendCooldown > 0"
              @click="resendCode"
              :loading="resending"
            >
              {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
            </v-btn>
          </div>
        </v-form>

        <!-- Back to Login -->
        <div class="text-center pt-6 border-t mt-8">
          <NuxtLink to="/auth/login" class="text-body-2 text-grey-darken-1 text-decoration-none">
            <v-icon start size="16">mdi-arrow-left</v-icon>
            Back to Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// State
const code = ref(['', '', '', '', '', ''])
const codeInputs = ref<HTMLInputElement[]>([])
const verifying = ref(false)
const resending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const resendCooldown = ref(0)
const email = ref('')
const password = ref('')

let cooldownTimer: any = null

// Computed
const isCodeComplete = computed(() => code.value.every(digit => digit !== ''))
const fullCode = computed(() => code.value.join(''))
const maskedEmail = computed(() => {
  if (!email.value) return '****@****.com'
  const [username, domain] = email.value.split('@')
  const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1)
  return `${maskedUsername}@${domain}`
})

// Methods
const handleInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value

  // Only allow digits
  if (value && !/^\d$/.test(value)) {
    code.value[index] = ''
    return
  }

  code.value[index] = value

  // Move to next input if value is entered
  if (value && index < 5) {
    codeInputs.value[index + 1]?.focus()
  }
}

const handleKeyDown = (index: number, event: KeyboardEvent) => {
  // Handle backspace
  if (event.key === 'Backspace' && !code.value[index] && index > 0) {
    codeInputs.value[index - 1]?.focus()
  }

  // Handle left/right arrows
  if (event.key === 'ArrowLeft' && index > 0) {
    codeInputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowRight' && index < 5) {
    codeInputs.value[index + 1]?.focus()
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text')
  if (!pastedData) return

  const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6)
  digits.forEach((digit, index) => {
    code.value[index] = digit
  })

  // Focus the next empty input or the last input
  const nextEmptyIndex = digits.length < 6 ? digits.length : 5
  codeInputs.value[nextEmptyIndex]?.focus()
}

const handleVerify = async () => {
  if (!isCodeComplete.value) return

  verifying.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.verify2FA(email.value, password.value, fullCode.value)
    
    successMessage.value = 'Verification successful! Redirecting...'
    
    // Clear session storage
    if (process.client) {
      sessionStorage.removeItem('2fa_email')
      sessionStorage.removeItem('2fa_password')
    }

    // Redirect after short delay
    setTimeout(async () => {
      const redirectTo = localStorage.getItem('redirectAfterLogin') || '/admin'
      if (localStorage.getItem('redirectAfterLogin')) {
        localStorage.removeItem('redirectAfterLogin')
      }
      await router.push(redirectTo)
    }, 1500)
  } catch (error: any) {
    console.error('2FA verification error:', error)
    errorMessage.value = error.data?.message || error.statusMessage || 'Invalid verification code. Please try again.'
    // Clear code inputs
    code.value = ['', '', '', '', '', '']
    codeInputs.value[0]?.focus()
  } finally {
    verifying.value = false
  }
}

const resendCode = async () => {
  resending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.resend2FACode(email.value)
    successMessage.value = 'A new verification code has been sent to your email'
    
    // Start cooldown
    resendCooldown.value = 60
    cooldownTimer = setInterval(() => {
      resendCooldown.value--
      if (resendCooldown.value <= 0) {
        clearInterval(cooldownTimer)
      }
    }, 1000)
  } catch (error: any) {
    console.error('Resend error:', error)
    errorMessage.value = error.data?.message || error.statusMessage || 'Failed to resend code. Please try again.'
  } finally {
    resending.value = false
  }
}

onMounted(() => {
  // Get email and password from session storage
  if (process.client) {
    email.value = sessionStorage.getItem('2fa_email') || ''
    password.value = sessionStorage.getItem('2fa_password') || ''

    // Redirect to login if no credentials
    if (!email.value || !password.value) {
      router.push('/auth/login')
      return
    }
  }

  // Focus first input
  setTimeout(() => {
    codeInputs.value[0]?.focus()
  }, 100)
})

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.verify-2fa-container {
  display: grid;
  grid-template-columns: 45% 55%;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

@media (max-width: 960px) {
  .verify-2fa-container {
    grid-template-columns: 1fr;
  }
}

/* Hero Sidebar */
.hero-sidebar {
  position: relative;
  overflow: hidden;
  background: #000;
}

.parallax-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.parallax-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  animation: kenBurns 20s ease-in-out infinite alternate;
}

@keyframes kenBurns {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(25,118,210,0.5) 100%);
  z-index: 1;
}

.hero-content-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Form Section */
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: #fafafa;
}

.form-inner-container {
  width: 100%;
  max-width: 480px;
}

.security-icon-wrapper {
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(25, 118, 210, 0.15);
}

/* Code Input */
.code-input-container {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 1rem;
}

.code-input {
  width: 56px;
  height: 64px;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
  background: white;
}

.code-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1);
}

.code-input:not(:placeholder-shown) {
  border-color: #1976d2;
  background: #E3F2FD;
}

/* Premium Label */
.premium-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #424242;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Login Button */
.login-btn {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 960px) {
  .form-section {
    padding: 2rem 1.5rem;
  }

  .code-input {
    width: 48px;
    height: 56px;
    font-size: 24px;
  }

  .code-input-container {
    gap: 8px;
  }
}
</style>


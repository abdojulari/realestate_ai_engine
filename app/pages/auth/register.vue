<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="pa-4">
          <v-card-title class="text-center text-h4 mb-4">
            Create Account
          </v-card-title>

          <v-form @submit.prevent="handleSubmit" v-model="isFormValid">
            <v-alert
              v-if="formError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ formError }}
              <template v-if="showLoginHint">
                <NuxtLink to="/auth/login" class="text-primary text-decoration-none ml-1">
                  Proceed to login
                </NuxtLink>
              </template>
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="firstName"
                  label="First Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="lastName"
                  label="Last Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>
            </v-row>

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
              v-model="phone"
              label="Phone Number"
              type="tel"
              :rules="phoneRules"
              variant="outlined"
              prepend-inner-icon="mdi-phone"
            />

            <v-select
              v-model="preferredContactTime"
              :items="contactTimeOptions"
              label="Preferred Contact Time"
              variant="outlined"
              prepend-inner-icon="mdi-clock"
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

            <v-text-field
              v-model="confirmPassword"
              label="Confirm Password"
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="[...passwordRules, passwordConfirmationRule]"
              required
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
            />

            <v-checkbox
              v-model="agreeToTerms"
              :rules="[(v) => !!v || 'You must agree to continue']"
              required
            >
              <template v-slot:label>
                I agree to the
                <NuxtLink to="/terms" class="text-primary text-decoration-none">
                  Terms of Service
                </NuxtLink>
                and
                <NuxtLink to="/privacy" class="text-primary text-decoration-none">
                  Privacy Policy
                </NuxtLink>
              </template>
            </v-checkbox>

            <v-btn
              type="submit"
              color="primary"
              block
              class="mt-4"
              :loading="loading"
              :disabled="!isFormValid || !agreeToTerms"
            >
              Create Account
            </v-btn>
          </v-form>

          <div class="text-center mt-4">
            <span class="text-body-2">Already have an account?</span>
            <NuxtLink to="/auth/login" class="text-primary text-decoration-none ml-2">
              Sign In
            </NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
// Nuxt 4 auto-imports: useRouter, ref, etc.
const auth = useAuth()
const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const preferredContactTime = ref('')
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

const passwordConfirmationRule = (v: string) => 
  v === password.value || 'Passwords must match'

const handleSubmit = async () => {
  loading.value = true
  formError.value = null
  showLoginHint.value = false
  try {
    const success = await auth.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
      phone: phone.value,
      preferredContactTime: preferredContactTime.value
    })
    
    if (success) {
      router.push('/')
    }
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

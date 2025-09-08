<template>
  <div class="forgot-password-container">
    <!-- Hero Section -->
    <div class="d-none d-md-flex">
      <v-img height="100%" min-height="440" cover src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1920&auto=format&fit=crop" referrerpolicy="no-referrer">
          <div class="d-flex flex-column text-white align-center justify-center h-100 pa-6" style="background: linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.45) 100%);">
            <h1 class="hero-title">Reset Your Password</h1>
            <p class="hero-subtitle">
              Enter your email address and we'll send you<br>
              instructions to reset your password
            </p>
          </div>
        </v-img>
    </div>

    <!-- Form Section -->
    <div class="form-section">
      <div class="form-container">
        <!-- Welcome Header -->
        <div class="welcome-header mb-8">
          <h1 class="welcome-title">Forgot Password</h1>
          <p class="welcome-subtitle">Enter your email address to receive password reset instructions</p>
        </div>

        <!-- Reset Form -->
        <v-form @submit.prevent="handleSubmit" v-if="!emailSent">
          <div class="form-group mb-6">
            <label class="form-label">Email Address</label>
            <v-text-field
              v-model="email"
              type="email"
              required
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-text-field"
              placeholder="Enter your email address"
            />
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
            color="primary"
            block
            size="large"
            class="reset-btn mb-6"
            :loading="loading"
            :disabled="!email || loading"
          >
            Send Reset Instructions
          </v-btn>
        </v-form>

        <!-- Success Message -->
        <div v-else class="success-message">
          <v-icon color="success" size="64" class="mb-4">mdi-email-check</v-icon>
          <h2 class="success-title mb-4">Check Your Email</h2>
          <p class="success-text mb-6">
            We've sent password reset instructions to <strong>{{ email }}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <v-btn
            color="primary"
            variant="outlined"
            @click="emailSent = false"
          >
            Try Another Email
          </v-btn>
        </div>

        <!-- Back to Login Link -->
        <div class="back-link">
          <NuxtLink to="/auth/login" class="back-link-btn">
            <v-icon start>mdi-arrow-left</v-icon>
            Back to Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const emailSent = ref(false)

const handleSubmit = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    // TODO: Implement actual password reset API call
    // For now, we'll simulate the request
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate success
    emailSent.value = true
    
    // In a real implementation, you would call:
    // await $fetch('/api/auth/forgot-password', {
    //   method: 'POST',
    //   body: { email: email.value }
    // })
  } catch (error: any) {
    console.error('Password reset error:', error)
    
    // Extract user-friendly error message
    let message = 'Failed to send reset instructions. Please try again.'
    
    if (error?.data?.statusMessage || error?.statusMessage) {
      const statusMessage = error.data?.statusMessage || error.statusMessage
      if (statusMessage.includes('User not found')) {
        message = 'No account found with this email address.'
      } else if (statusMessage.includes('Rate limit')) {
        message = 'Too many requests. Please wait before trying again.'
      } else {
        message = statusMessage
      }
    }
    
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

// SEO
useHead({
  title: 'Forgot Password - HomesByAbdulOjulari',
  meta: [
    { name: 'description', content: 'Reset your password for HomesByAbdulOjulari. Enter your email to receive reset instructions.' }
  ]
})
</script>

<style scoped>
.forgot-password-container {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
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

.welcome-header {
  text-align: center;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.welcome-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin-top: 8px;
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

.reset-btn {
  border-radius: 12px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  font-size: 1rem !important;
  padding: 12px 0 !important;
  background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
}

.success-message {
  text-align: center;
  padding: 40px 0;
}

.success-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.success-text {
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.6;
}

.back-link {
  text-align: center;
  margin-top: 24px;
}

.back-link-btn {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.back-link-btn:hover {
  color: #2563eb;
  text-decoration: underline;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .forgot-password-container {
    flex-direction: column;
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

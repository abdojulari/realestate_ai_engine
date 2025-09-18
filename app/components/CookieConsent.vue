<template>
  <div 
    v-if="!isAccepted" 
    class="cookie-consent-banner"
    :class="{ 'mobile': isMobile }"
  >
    <div class="cookie-consent-container">
      <div class="cookie-consent-content">
        <div class="cookie-text">
          <p class="cookie-message">
            This website stores cookies on your computer. These cookies are used to collect information about how you interact with our website and allow us to remember you. We use this information in order to improve and customize your browsing experience and for analytics and metrics about our visitors both on this website and other media. To find out more about the cookies we use, see our Privacy Policy.
          </p>
        </div>
        <div class="cookie-actions">
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            class="accept-btn text-none font-weight-medium"
            @click="acceptCookies"
          >
            Accept
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const isAccepted = ref(true) // Start as true to prevent flash before mount

onMounted(() => {
  // Check if cookies have been accepted
  const cookieConsent = localStorage.getItem('cookieConsent')
  isAccepted.value = cookieConsent === 'accepted'
})

const acceptCookies = () => {
  localStorage.setItem('cookieConsent', 'accepted')
  isAccepted.value = true
}
</script>

<style scoped>
.cookie-consent-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.cookie-consent-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
}

.cookie-consent-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.cookie-text {
  flex: 1;
}

.cookie-message {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.cookie-actions {
  flex-shrink: 0;
}

.accept-btn {
  min-width: 120px;
  height: 48px;
}

/* Mobile responsive styles */
.cookie-consent-banner.mobile .cookie-consent-container {
  padding: 16px 20px;
}

.cookie-consent-banner.mobile .cookie-consent-content {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.cookie-consent-banner.mobile .cookie-message {
  font-size: 13px;
  text-align: center;
}

.cookie-consent-banner.mobile .cookie-actions {
  display: flex;
  justify-content: center;
}

.cookie-consent-banner.mobile .accept-btn {
  width: 100%;
  max-width: 200px;
}

/* Tablet styles */
@media (max-width: 768px) and (min-width: 481px) {
  .cookie-consent-container {
    padding: 18px 20px;
  }
  
  .cookie-consent-content {
    gap: 20px;
  }
  
  .cookie-message {
    font-size: 13px;
  }
}

/* Very small mobile screens */
@media (max-width: 480px) {
  .cookie-consent-container {
    padding: 14px 16px;
  }
  
  .cookie-message {
    font-size: 12px;
    line-height: 1.5;
  }
  
  .accept-btn {
    height: 44px;
    font-size: 14px;
  }
}
</style>

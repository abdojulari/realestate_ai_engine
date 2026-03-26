<template>
  <div v-if="showBanner" class="cookie-consent-banner" :class="{ 'mobile': isMobile }">
    <div class="cookie-consent-container">
      <div class="cookie-consent-content">
        <div class="cookie-text">
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-shield-lock-outline" size="20" color="primary" class="mr-2" />
            <span class="font-weight-bold text-body-1">Your Privacy Matters</span>
          </div>
          <p class="cookie-message">
            DeelBot uses cookies and similar technologies to provide our services. In accordance with PIPEDA, 
            we request your consent for optional data processing. Essential cookies are required for the platform to function.
          </p>
        </div>
        <div class="cookie-actions">
          <v-btn
            variant="outlined"
            size="large"
            class="text-none font-weight-medium mr-2"
            @click="showDetails = true"
          >
            Manage Preferences
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            class="accept-btn text-none font-weight-medium"
            @click="acceptAll"
          >
            Accept All
          </v-btn>
        </div>
      </div>
    </div>
  </div>

  <!-- Detailed Consent Dialog -->
  <v-dialog v-model="showDetails" max-width="640" persistent>
    <v-card class="rounded-xl">
      <v-card-title class="d-flex align-center pa-6 pb-2">
        <v-icon icon="mdi-cookie-cog" color="primary" class="mr-3" />
        <span class="text-h6 font-weight-bold">Privacy Preferences</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="showDetails = false" />
      </v-card-title>

      <v-card-text class="px-6">
        <p class="text-body-2 text-grey-darken-1 mb-6">
          Under PIPEDA, you have the right to control how your personal information is collected and used. 
          Customize your preferences below. Essential cookies cannot be disabled as they are required for the platform to function.
        </p>

        <div v-for="category in consentCategories" :key="category.id" class="consent-category mb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon :icon="category.icon" size="20" color="primary" class="mr-3" />
              <div>
                <div class="font-weight-bold text-body-2">{{ category.title }}</div>
                <div class="text-caption text-grey">{{ category.description }}</div>
              </div>
            </div>
            <v-switch
              v-model="preferences[category.id]"
              :disabled="category.required"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </div>
        </div>

        <v-divider class="my-4" />
        <div class="text-caption text-grey-darken-1">
          <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
          Your preferences are saved locally and can be changed at any time from the 
          <NuxtLink to="/privacy" class="text-primary">Privacy Policy</NuxtLink> page. 
          Consent records are logged with timestamps in accordance with PIPEDA accountability requirements.
        </div>
      </v-card-text>

      <v-card-actions class="pa-6 pt-2">
        <v-btn variant="outlined" class="text-none" @click="rejectOptional">
          Essential Only
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" class="text-none font-weight-medium" @click="savePreferences">
          Save Preferences
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const showBanner = ref(false)
const showDetails = ref(false)

interface ConsentCategory {
  id: string
  title: string
  description: string
  icon: string
  required: boolean
}

const consentCategories: ConsentCategory[] = [
  {
    id: 'essential',
    title: 'Essential Cookies',
    description: 'Authentication, security, and core platform functionality. Always active.',
    icon: 'mdi-lock-outline',
    required: true,
  },
  {
    id: 'functional',
    title: 'Functional Cookies',
    description: 'Remember your preferences, saved searches, and display settings.',
    icon: 'mdi-cog-outline',
    required: false,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Help us understand how you use the platform to improve our services.',
    icon: 'mdi-chart-line',
    required: false,
  },
  {
    id: 'marketing',
    title: 'Marketing & Communications',
    description: 'Personalized property recommendations and promotional communications.',
    icon: 'mdi-bullhorn-outline',
    required: false,
  },
]

const preferences = reactive<Record<string, boolean>>({
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
})

const STORAGE_KEY = 'pipeda_consent'

interface ConsentRecord {
  preferences: Record<string, boolean>
  timestamp: string
  version: string
}

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const record: ConsentRecord = JSON.parse(stored)
      Object.assign(preferences, record.preferences)
      preferences.essential = true
    } catch {
      showBanner.value = true
    }
  } else {
    showBanner.value = true
  }
})

const saveConsentRecord = () => {
  const record: ConsentRecord = {
    preferences: { ...preferences },
    timestamp: new Date().toISOString(),
    version: '1.0',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  showBanner.value = false
  showDetails.value = false
}

const acceptAll = () => {
  preferences.functional = true
  preferences.analytics = true
  preferences.marketing = true
  saveConsentRecord()
}

const rejectOptional = () => {
  preferences.functional = false
  preferences.analytics = false
  preferences.marketing = false
  saveConsentRecord()
}

const savePreferences = () => {
  saveConsentRecord()
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
  display: flex;
  align-items: center;
}

.accept-btn {
  min-width: 120px;
  height: 48px;
}

.consent-category {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #f1f1ee;
}

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
}

.cookie-consent-banner.mobile .cookie-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

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

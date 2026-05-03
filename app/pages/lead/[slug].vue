<template>
  <div class="lead-page" :style="{ '--brand': form?.brandColor || '#1976D2' }">
    <!-- Loading -->
    <div v-if="loading" class="lead-center">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="lead-center">
      <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-link-off</v-icon>
      <h2 class="text-h5 font-weight-bold mb-2">Form Not Available</h2>
      <p class="text-medium-emphasis">This form may have been deactivated or the link is invalid.</p>
    </div>

    <!-- Submitted -->
    <div v-else-if="submitted" class="lead-center">
      <div class="success-card">
        <div class="success-icon-wrap">
          <v-icon size="48" color="white">mdi-check-circle</v-icon>
        </div>
        <h2 class="text-h4 font-weight-bold mb-3 mt-6">Submitted!</h2>
        <p class="text-body-1 text-medium-emphasis px-4">{{ form?.thankYouMessage || 'Thank you! We will be in touch shortly.' }}</p>
        <div class="mt-6">
          <img src="/images/logos/deelbot.png" alt="DeelBot" class="powered-logo" />
          <p class="text-caption text-disabled mt-1">Powered by DeelBot</p>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div v-else-if="form" class="lead-center">
      <v-snackbar v-model="submitError" color="error" :timeout="6000" location="top">
        <v-icon icon="mdi-alert-circle" class="mr-2" />
        {{ submitErrorMessage }}
        <template #actions>
          <v-btn variant="text" @click="submitError = false">Dismiss</v-btn>
        </template>
      </v-snackbar>
      <div class="form-container">
        <!-- Header -->
        <div class="form-header" :style="{ background: `linear-gradient(135deg, ${form.brandColor}, ${adjustColor(form.brandColor, -30)})` }">
          <img :src="form.logoUrl || '/images/logos/deelbot.png'" :alt="form.businessName" class="form-logo" />
          <h1 class="form-title">{{ form.title }}</h1>
          <p v-if="form.description" class="form-desc">{{ form.description }}</p>
        </div>

        <!-- Body -->
        <div class="form-body">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <template v-for="field in activeFields" :key="field.value">
              <v-text-field
                v-if="field.type === 'text'"
                v-model="submission[field.value]"
                :label="field.label"
                :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
                :prepend-inner-icon="field.icon"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
              <v-textarea
                v-else-if="field.type === 'textarea'"
                v-model="submission[field.value]"
                :label="field.label"
                :prepend-inner-icon="field.icon"
                variant="outlined"
                density="comfortable"
                rows="3"
                class="mb-1"
              />
              <v-select
                v-else-if="field.type === 'select'"
                v-model="submission[field.value]"
                :label="field.label"
                :items="field.options"
                :prepend-inner-icon="field.icon"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </template>

            <!-- Disclaimer -->
            <div v-if="form.disclaimerText" class="disclaimer-box mb-4">
              <v-icon size="16" class="mr-2 text-medium-emphasis">mdi-shield-check</v-icon>
              <span class="text-caption text-medium-emphasis">{{ form.disclaimerText }}</span>
            </div>

            <!-- Privacy -->
            <div v-if="form.privacyText" class="privacy-box mb-5">
              <v-icon size="14" class="mr-1 text-disabled">mdi-lock</v-icon>
              <span class="text-caption text-disabled">{{ form.privacyText }}</span>
            </div>

            <v-btn
              type="submit"
              block
              size="large"
              :loading="submitting"
              :style="{ background: form.brandColor, color: 'white' }"
              class="submit-btn"
            >
              <v-icon start>mdi-send</v-icon>
              Submit
            </v-btn>
          </v-form>

          <div class="text-center mt-6">
            <img src="/images/logos/deelbot.png" alt="DeelBot" class="powered-logo" />
            <p class="text-caption text-disabled mt-1">Powered by DeelBot</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = route.params.slug as string

const form = ref<any>(null)
const loading = ref(true)
const error = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const formRef = ref<any>(null)
const submission = ref<Record<string, string>>({})
const submitError = ref(false)
const submitErrorMessage = ref('')

const fieldConfig: Record<string, any> = {
  name: { label: 'Full Name', icon: 'mdi-account', type: 'text', required: true },
  email: { label: 'Email Address', icon: 'mdi-email', type: 'text', required: true },
  phone: { label: 'Phone Number', icon: 'mdi-phone', type: 'text', required: false },
  message: { label: 'Message', icon: 'mdi-message-text', type: 'textarea', required: false },
  address: { label: 'Property Address', icon: 'mdi-map-marker', type: 'text', required: false },
  budget: { label: 'Budget Range', icon: 'mdi-currency-usd', type: 'select', required: false, options: ['Under $300K', '$300K - $500K', '$500K - $750K', '$750K - $1M', '$1M - $2M', '$2M+'] },
  timeline: { label: 'Timeline', icon: 'mdi-calendar', type: 'select', required: false, options: ['ASAP', '1-3 months', '3-6 months', '6-12 months', 'Just exploring'] },
  propertyType: { label: 'Property Type', icon: 'mdi-home', type: 'select', required: false, options: ['Detached', 'Semi-Detached', 'Townhouse', 'Condo', 'Other'] },
}

const activeFields = computed(() => {
  if (!form.value?.fields) return []
  const fields = Array.isArray(form.value.fields) ? form.value.fields : ['name', 'email', 'phone', 'message']
  return fields.map((f: string) => ({ value: f, ...fieldConfig[f] })).filter((f: any) => f.label)
})

function adjustColor(hex: string, amount: number) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

async function loadForm() {
  loading.value = true
  try {
    form.value = await $fetch(`/api/lead-form/${slug}`)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const meta = useMetaPixel()

async function submitForm() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  submitting.value = true
  submitError.value = false
  const metaEventId = meta.newEventId()
  try {
    await $fetch(`/api/lead-form/${slug}`, {
      method: 'POST',
      body: { ...submission.value, _metaEventId: metaEventId },
    })
    meta.trackLead(
      {
        content_name: form.value?.title || 'Lead form',
        content_category: 'lead_form',
      },
      { eventId: metaEventId }
    )
    submitted.value = true
  } catch (e: any) {
    console.error('Submit failed:', e)
    // Surface the failure to the visitor — previously the spinner just
    // stopped and they had no idea whether the form was sent.
    submitErrorMessage.value =
      e?.data?.statusMessage ||
      e?.statusMessage ||
      e?.message ||
      'We could not submit your request. Please try again.'
    submitError.value = true
  } finally {
    submitting.value = false
  }
}

onMounted(loadForm)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.lead-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #f0f2f5 0%, #e8eaed 50%, #f5f5f5 100%);
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-center { width: 100%; max-width: 520px; text-align: center; }

.form-container {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
}

.form-header {
  padding: 40px 32px 32px;
  text-align: center;
  color: white;
}

.form-logo {
  height: 48px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
  margin-bottom: 20px;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  line-height: 1.3;
}

.form-desc {
  font-size: 14px;
  opacity: 0.85;
  margin: 0;
  line-height: 1.5;
}

.form-body { padding: 32px; }

.disclaimer-box {
  display: flex;
  align-items: flex-start;
  background: #f9fafb;
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
}

.privacy-box {
  display: flex;
  align-items: flex-start;
  padding: 0 4px;
}

.submit-btn {
  border-radius: 14px !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  text-transform: none !important;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15) !important;
  transition: all 0.3s ease !important;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; }

.powered-logo {
  height: 24px;
  width: auto;
  opacity: 0.4;
  filter: grayscale(1);
}

.success-card {
  background: white;
  border-radius: 24px;
  padding: 48px 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
}

.success-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #43a047, #66bb6a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(67,160,71,0.3);
}
</style>

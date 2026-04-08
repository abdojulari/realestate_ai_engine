<template>
  <div class="resource-page" :style="{ '--brand': meta?.brandColor || '#1976D2' }">
    <div v-if="loading" class="resource-center">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <div v-else-if="error" class="resource-center">
      <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-link-off</v-icon>
      <h2 class="text-h5 font-weight-bold mb-2">Resource not available</h2>
      <p class="text-medium-emphasis">This link may be invalid or the resource is unpublished.</p>
      <v-btn class="mt-6" variant="tonal" to="/resources">Back to resources</v-btn>
    </div>

    <!-- Gate form -->
    <div v-else-if="meta && !unlocked" class="resource-center">
      <div class="form-container">
        <div
          class="form-header"
          :style="{
            background: `linear-gradient(135deg, ${meta.brandColor}, ${adjustColor(meta.brandColor, -30)})`,
          }"
        >
          <img :src="meta.logoUrl" :alt="meta.businessName" class="form-logo" />
          <h1 class="form-title">{{ meta.title }}</h1>
          <p v-if="meta.description" class="form-desc">{{ meta.description }}</p>
        </div>
        <div class="form-body">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Enter your details to view or download this resource. We’ll use this information to follow up if helpful.
          </p>
          <v-form ref="formRef" @submit.prevent="submitGate">
            <v-text-field
              v-model="gate.firstName"
              label="First name"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              :rules="[(v: string) => !!v?.trim() || 'Required']"
              class="mb-2"
            />
            <v-text-field
              v-model="gate.lastName"
              label="Last name"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              :rules="[(v: string) => !!v?.trim() || 'Required']"
              class="mb-2"
            />
            <v-text-field
              v-model="gate.email"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              density="comfortable"
              :rules="[emailRule]"
              class="mb-2"
            />
            <v-text-field
              v-model="gate.phone"
              label="Phone"
              prepend-inner-icon="mdi-phone-outline"
              variant="outlined"
              density="comfortable"
              :rules="[(v: string) => !!v?.trim() || 'Required']"
              class="mb-4"
            />
            <v-btn
              type="submit"
              block
              size="large"
              :loading="submitting"
              :style="{ background: meta.brandColor, color: 'white' }"
              class="submit-btn"
            >
              Continue
            </v-btn>
          </v-form>
        </div>
      </div>
    </div>

    <!-- Unlocked viewer -->
    <div v-else-if="meta && unlocked" class="viewer-wrap">
      <div class="viewer-bar">
        <div class="d-flex align-center flex-wrap ga-2">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/resources">All resources</v-btn>
          <span class="text-subtitle-1 font-weight-bold">{{ meta.title }}</span>
        </div>
        <div class="d-flex ga-2 mt-2 mt-sm-0">
          <v-btn
            :href="`${fileUrl}?download=1`"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-download"
            rel="noopener"
          >
            Download
          </v-btn>
        </div>
      </div>

      <div class="viewer-body">
        <iframe v-if="isPdf" class="pdf-frame" title="Document" :src="fileUrl" />
        <img v-else-if="isImage" class="image-view" :src="fileUrl" :alt="meta.title" />
        <v-alert v-else type="info" variant="tonal" class="ma-4">
          <a :href="`${fileUrl}?download=1`" class="text-primary font-weight-bold">Download this file</a>
          to open it on your device.
        </v-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const meta = ref<{
  title: string
  description: string | null
  thankYouMessage: string | null
  mimeType: string
  originalFileName: string
  logoUrl: string
  businessName: string
  brandColor: string
} | null>(null)

const loading = ref(true)
const error = ref(false)
const unlocked = ref(false)
const submitting = ref(false)
const formRef = ref<any>(null)

const gate = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
})

const fileUrl = computed(() => `/api/public/resources/${slug.value}/file`)

const isPdf = computed(() => meta.value?.mimeType?.includes('pdf'))
const isImage = computed(() => meta.value?.mimeType?.startsWith('image/'))

function adjustColor(hex: string, amount: number) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function emailRule(v: string) {
  const s = (v || '').trim()
  if (!s) return 'Required'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || 'Enter a valid email'
}

async function loadMeta() {
  loading.value = true
  error.value = false
  try {
    meta.value = await $fetch(`/api/public/resources/${slug.value}`)
  } catch {
    meta.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

async function checkAccess() {
  try {
    const { unlocked: u } = await $fetch<{ unlocked: boolean }>(
      `/api/public/resources/${slug.value}/access`,
      { credentials: 'include' }
    )
    unlocked.value = u
  } catch {
    unlocked.value = false
  }
}

async function submitGate() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }
  submitting.value = true
  try {
    await $fetch(`/api/public/resources/${slug.value}/unlock`, {
      method: 'POST',
      body: {
        firstName: gate.value.firstName.trim(),
        lastName: gate.value.lastName.trim(),
        email: gate.value.email.trim(),
        phone: gate.value.phone.trim(),
      },
      credentials: 'include',
    })
    unlocked.value = true
  } catch (e: any) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

watch(slug, () => {
  loadMeta().then(() => checkAccess())
})

onMounted(async () => {
  await loadMeta()
  if (!error.value) await checkAccess()
})

useHead(() => ({
  title: meta.value?.title ? `${meta.value.title} · Resource` : 'Resource',
}))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.resource-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #f0f2f5 0%, #e8eaed 50%, #f5f5f5 100%);
  font-family: 'Inter', sans-serif;
}

.resource-center {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.form-container {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  width: 100%;
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

.form-body {
  padding: 32px;
}

.submit-btn {
  border-radius: 14px !important;
  font-weight: 700 !important;
  text-transform: none !important;
}

.viewer-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.viewer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
}

.viewer-body {
  flex: 1;
  min-height: 0;
  background: #2a2a2a;
}

.pdf-frame {
  width: 100%;
  height: calc(100vh - 56px);
  border: none;
  display: block;
}

.image-view {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 56px);
  margin: 0 auto;
  object-fit: contain;
}
</style>

<template>
  <div v-if="loading" class="ic-loading">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else-if="error" class="ic-empty">
    <v-icon size="56" color="grey-lighten-1">mdi-card-account-details-outline</v-icon>
    <h2 class="text-h6 mt-4 mb-1">Card not found</h2>
    <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 320px">
      This link may be inactive or the agent has disabled their card.
    </p>
    <v-btn class="mt-4" :to="`/connect/${slug}`" variant="text">Back</v-btn>
  </div>

  <div v-else class="ic-shell" :style="cssVars">
    <!-- Compact header -->
    <header class="ic-cap-header">
      <v-btn
        :to="`/connect/${slug}`"
        icon="mdi-arrow-left"
        variant="text"
        density="comfortable"
        aria-label="Back"
      />
      <div class="ic-cap-header__title">
        <span class="ic-cap-header__overline">Connect with</span>
        <span class="ic-cap-header__name">{{ data.profile.firstName }}</span>
      </div>
      <div style="width:40px" />
    </header>

    <main class="ic-cap-main">
      <v-card v-if="!submitted" class="ic-cap-card" elevation="0">
        <v-card-text class="pa-5 pa-sm-6">
          <p class="text-body-2 text-medium-emphasis mb-5">
            Share your details and {{ data.profile.firstName }} will be in touch shortly.
          </p>

          <v-form v-model="formValid" @submit.prevent="submit">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.firstName"
                  label="First name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.lastName"
                  label="Last name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.phone"
                  label="Phone"
                  variant="outlined"
                  density="comfortable"
                  type="tel"
                  inputmode="tel"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  variant="outlined"
                  density="comfortable"
                  type="email"
                  inputmode="email"
                  :rules="emailRules"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.company"
                  label="Company (optional)"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="form.interest"
                  :items="interestOptions"
                  label="I'm interested in (optional)"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.message"
                  label="Message (optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  auto-grow
                />
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="form.consent"
                  density="compact"
                  hide-details
                  :rules="[(v: boolean) => v === true || 'Required']"
                >
                  <template #label>
                    <span class="text-body-2">
                      I agree to be contacted by
                      {{ data.profile.firstName }} regarding my enquiry.
                    </span>
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-5 px-sm-6 pb-6 pt-0 d-flex flex-column align-stretch ga-2">
          <v-btn
            color="primary"
            class="ic-btn-primary"
            :loading="submitting"
            :disabled="!formValid"
            block
            size="large"
            @click="submit"
          >
            Send my details
          </v-btn>
          <v-btn
            variant="text"
            block
            size="large"
            class="ic-btn-link"
            :to="`/connect/${slug}`"
          >
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- SUCCESS STATE -->
      <v-card v-else class="ic-cap-card ic-cap-card--success" elevation="0">
        <div class="ic-cap-success__icon">
          <v-icon color="success" size="56">mdi-check-circle</v-icon>
        </div>
        <h2 class="ic-cap-success__title">You're connected!</h2>
        <p class="ic-cap-success__body">{{ thanksMessage }}</p>

        <v-btn
          color="primary"
          class="ic-btn-primary"
          block
          size="large"
          prepend-icon="mdi-account-plus"
          @click="onSaveContact"
        >
          Save {{ data.profile.firstName }} to my contacts
        </v-btn>
        <v-btn
          variant="text"
          block
          size="large"
          class="ic-btn-link mt-2"
          :to="`/connect/${slug}`"
        >
          Back to card
        </v-btn>
      </v-card>
    </main>

    <v-snackbar v-model="snack.show" :color="snack.color" location="top" :timeout="3500">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useHead } from '#imports'

definePageMeta({ layout: false })

interface CardData {
  slug: string
  profile: {
    firstName: string
    lastName: string
    fullName: string
    email: string | null
    phone: string | null
  }
  branding: { primaryColor: string }
}

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase())

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CardData | null>(null) as { value: CardData | null } & { value: any }

const formValid = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const thanksMessage = ref('')
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  interest: null as string | null,
  message: '',
  consent: false,
})

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email must be valid',
]

const interestOptions = [
  { title: 'Buying', value: 'buying' },
  { title: 'Selling', value: 'selling' },
  { title: 'Renting', value: 'renting' },
  { title: 'Just connecting', value: 'connecting' },
]

const cssVars = computed(() => {
  const c = data.value?.branding?.primaryColor || '#0F172A'
  return { '--ic-primary': c } as Record<string, string>
})

const vcardUrl = computed(() => `/api/insta-connect/${slug.value}/vcard`)

async function loadCard() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<CardData>(`/api/insta-connect/${slug.value}`)
    data.value = res
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Card not available'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!formValid.value) return
  submitting.value = true
  try {
    const res: any = await $fetch(`/api/insta-connect/${slug.value}/capture`, {
      method: 'POST',
      body: { ...form },
    })
    thanksMessage.value =
      res?.message || `Thanks — ${data.value?.profile.firstName} will be in touch shortly.`
    submitted.value = true
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    snack.color = 'error'
    snack.msg = e?.data?.statusMessage || e?.statusMessage || 'Could not send your details'
    snack.show = true
  } finally {
    submitting.value = false
  }
}

function onSaveContact() {
  if (typeof window !== 'undefined') window.location.href = vcardUrl.value
}

useHead(() => ({
  title: data.value?.profile.fullName
    ? `Connect with ${data.value.profile.fullName}`
    : 'Connect',
  meta: [
    { name: 'theme-color', content: data.value?.branding?.primaryColor || '#0F172A' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  ],
  link: [
    { rel: 'manifest', href: `/api/insta-connect/${slug.value}/manifest` },
  ],
}))

onMounted(loadCard)
watch(slug, loadCard)
</script>

<style scoped>
.ic-loading,
.ic-empty {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.ic-shell {
  --ic-primary: #0f172a;
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  padding-top: env(safe-area-inset-top);
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.ic-cap-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}
.ic-cap-header__title { display: flex; flex-direction: column; align-items: center; }
.ic-cap-header__overline {
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}
.ic-cap-header__name { font-size: 1rem; font-weight: 800; color: #0f172a; }

.ic-cap-main {
  max-width: 520px;
  margin: 0 auto;
  padding: 18px 14px 40px;
}

.ic-cap-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
}
.ic-cap-card--success {
  text-align: center;
  padding: 40px 22px 28px;
}
.ic-cap-success__icon { margin-bottom: 14px; }
.ic-cap-success__title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}
.ic-cap-success__body {
  font-size: 0.95rem;
  color: #475569;
  margin-bottom: 22px;
  line-height: 1.55;
}

.ic-btn-primary {
  text-transform: none !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  height: 50px !important;
  letter-spacing: -0.01em !important;
}
.ic-btn-link {
  text-transform: none !important;
  font-weight: 600 !important;
}
</style>

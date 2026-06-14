<template>
  <div class="unsubscribe-page">
    <v-container class="py-16" max-width="640">
      <v-card class="unsubscribe-card" elevation="0">
        <div class="card-inner pa-10 text-center">
          <div class="accent-bar mx-auto mb-6"></div>

          <template v-if="state === 'loading'">
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="text-body-1 mt-4 text-medium-emphasis">Updating your subscription…</p>
          </template>

          <template v-else-if="state === 'success'">
            <v-icon icon="mdi-email-off-outline" size="56" color="primary" class="mb-4" />
            <h1 class="display-serif text-h4 mb-3">You've been unsubscribed</h1>
            <p class="text-body-1 text-medium-emphasis mb-6">
              <span v-if="email"><strong>{{ email }}</strong> will no longer receive newsletters from {{ tenantName }}.</span>
              <span v-else>You will no longer receive newsletters from {{ tenantName }}.</span>
            </p>
            <p class="text-caption text-medium-emphasis">
              Changed your mind?
              <NuxtLink to="/" class="resubscribe-link">Visit our site</NuxtLink>
              to resubscribe anytime.
            </p>
          </template>

          <template v-else-if="state === 'already'">
            <v-icon icon="mdi-check-circle-outline" size="56" color="success" class="mb-4" />
            <h1 class="display-serif text-h4 mb-3">Already unsubscribed</h1>
            <p class="text-body-1 text-medium-emphasis mb-6">
              <span v-if="email"><strong>{{ email }}</strong> is already opted out.</span>
              <span v-else>This address is already opted out.</span>
              You won't receive any further emails.
            </p>
            <p class="text-caption text-medium-emphasis">
              Want to start receiving them again?
              <NuxtLink to="/" class="resubscribe-link">Resubscribe on our site</NuxtLink>.
            </p>
          </template>

          <template v-else>
            <v-icon icon="mdi-alert-circle-outline" size="56" color="error" class="mb-4" />
            <h1 class="display-serif text-h4 mb-3">We couldn't process this link</h1>
            <p class="text-body-1 text-medium-emphasis mb-6">
              {{ errorMessage || 'This unsubscribe link is invalid or has expired. If you keep receiving emails you no longer want, please contact us.' }}
            </p>
            <v-btn color="primary" variant="flat" size="large" to="/" prepend-icon="mdi-home">
              Back to site
            </v-btn>
          </template>
        </div>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Unsubscribe',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

type State = 'loading' | 'success' | 'already' | 'error'

const route = useRoute()
const state = ref<State>('loading')
const email = ref<string>('')
const errorMessage = ref<string>('')

const { data: tenantSettings } = await useAsyncData('unsubscribe-tenant', async () => {
  try {
    return await $fetch<any>('/api/tenant-settings')
  } catch {
    return null
  }
})

const tenantName = computed(() =>
  tenantSettings.value?.adminFullName ||
  tenantSettings.value?.businessName ||
  'us'
)

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    state.value = 'error'
    errorMessage.value = 'This unsubscribe link is missing its token.'
    return
  }

  try {
    const res = await $fetch<any>('/api/newsletter/unsubscribe', {
      method: 'GET',
      params: { token },
    })

    if (res?.success) {
      email.value = res.email || ''
      state.value = res.alreadyUnsubscribed ? 'already' : 'success'
    } else {
      state.value = 'error'
      errorMessage.value = res?.message || ''
    }
  } catch (e: any) {
    state.value = 'error'
    errorMessage.value = e?.data?.message || 'Something went wrong. Please try again.'
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.unsubscribe-page {
  background-color: #fcfcfb;
  min-height: 70vh;
  font-family: 'Inter', sans-serif;
}

.unsubscribe-card {
  border-radius: 24px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  overflow: hidden;
}

.card-inner {
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%);
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.accent-bar {
  width: 56px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.resubscribe-link {
  color: #8c734b;
  font-weight: 600;
  text-decoration: none;
}
.resubscribe-link:hover {
  text-decoration: underline;
}
</style>

<template>
  <!-- Split hero with image and animated tips -->
  <v-container fluid class="py-0">
    <v-row no-gutters>
      <v-col cols="12" md="6">
        <v-img height="100%" min-height="440" cover src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1920&auto=format&fit=crop" referrerpolicy="no-referrer">
          <div class="d-flex flex-column justify-end h-100 pa-6" style="background: linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.45) 100%);">
            <div class="text-h5 text-white mb-2">We’re here to help</div>
            <div class="text-body-2 text-white">Buying or selling, ask us anything. A licensed agent will get back within 1 business day.</div>
          </div>
        </v-img>
      </v-col>
      <v-col cols="12" md="6">
        <div class="pa-8">
          <h1 class="text-h4 mb-2">Contact Us</h1>
          <div class="text-body-2 text-medium-emphasis mb-6">Tell us a bit about yourself and how we can help.</div>
          <v-card flat rounded="lg">
            <v-card-text>
              <v-form v-model="isValid" @submit.prevent="submit">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.firstName" label="First Name" :rules="[v=>!!v||'Required']" prepend-inner-icon="mdi-account" variant="outlined" density="comfortable" required />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.lastName" label="Last Name" :rules="[v=>!!v||'Required']" prepend-inner-icon="mdi-account" variant="outlined" density="comfortable" required />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.email" type="email" label="Email" :rules="emailRules" prepend-inner-icon="mdi-email" required variant="outlined" density="comfortable" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.phone" label="Phone" prepend-inner-icon="mdi-phone" variant="outlined" density="comfortable" />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea v-model="form.message" label="How can we help?" rows="5" :rules="[v=>!!v||'Required']" required variant="outlined" density="comfortable" />
                  </v-col>
                </v-row>
                <div class="d-flex align-center justify-space-between">
                  <div class="text-caption text-medium-emphasis">By sending, you agree to our terms. We respect your privacy.</div>
                  <v-btn color="primary" size="large" :loading="submitting" :disabled="!isValid" @click="submit">Send message</v-btn>
                </div>
              </v-form>
            </v-card-text>
          </v-card>

          <!-- Animated tips -->
          <div class="mt-8">
            <div class="text-subtitle-1 mb-2">Tips</div>
            <v-slide-group show-arrows>
              <v-slide-group-item v-for="(t, i) in tips" :key="i">
                <v-card class="mr-4" width="260" elevation="1">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-1">{{ t.title }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ t.text }}</div>
                  </v-card-text>
                </v-card>
              </v-slide-group-item>
            </v-slide-group>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
const isValid = ref(false)
const submitting = ref(false)
const form = ref({ firstName:'', lastName:'', email:'', phone:'', message:'' })
const tips = ref([
  { title: 'Selling', text: 'Declutter early and schedule pro photography for best first impressions.' },
  { title: 'Pricing', text: 'Price to the market, not just expectations—compare recent local sales.' },
  { title: 'Buying', text: 'Get pre-approved to strengthen your offer and set a clear budget.' },
  { title: 'Showings', text: 'Keep it light, bright, and neutral to appeal to more buyers.' }
])

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const submit = async () => {
  submitting.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: form.value })
    form.value = { firstName:'', lastName:'', email:'', phone:'', message:'' }
    isValid.value = false
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

definePageMeta({ layout: 'default' })
</script>



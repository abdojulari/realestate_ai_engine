<template>
  <div class="premium-page-wrapper">
    <v-img
      height="280"
      cover
      src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1920&auto=format&fit=crop"
      gradient="to bottom, rgba(18, 18, 18, 0.4), rgba(18, 18, 18, 0.9)"
      class="hero-section"
      referrerpolicy="no-referrer"
    >
      <v-container class="h-100 d-flex flex-column justify-center align-center text-center">
        <div class="premium-badge-light mb-4">PIPEDA Rights</div>
        <h1 class="display-serif-large text-white mb-4">Privacy Request</h1>
        <div class="elegant-divider-gold"></div>
      </v-container>
    </v-img>

    <v-container class="py-12">
      <v-row justify="center">
        <v-col cols="12" md="8" lg="6">
          <!-- Success State -->
          <v-card v-if="submitted" variant="flat" class="rounded-xl pa-10 text-center" color="grey-lighten-5">
            <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4" />
            <h2 class="text-h5 font-weight-bold mb-2">Request Submitted</h2>
            <p class="text-body-1 text-grey-darken-1 mb-6">
              Your privacy request has been received. Our Privacy Officer will respond within 30 days 
              as required by PIPEDA. You will receive a confirmation email at <strong>{{ form.email }}</strong>.
            </p>
            <v-btn color="primary" variant="flat" to="/" class="text-none" prepend-icon="mdi-home">
              Return Home
            </v-btn>
          </v-card>

          <!-- Request Form -->
          <v-card v-else variant="flat" class="rounded-xl pa-md-10 pa-6">
            <div class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-2">Exercise Your Privacy Rights</h2>
              <p class="text-body-2 text-grey-darken-1">
                Under PIPEDA, you have the right to access, correct, or delete your personal information, 
                and to withdraw your consent. Complete this form to submit a request to our Privacy Officer.
              </p>
            </div>

            <v-alert variant="tonal" color="info" density="compact" class="mb-8 rounded-lg">
              <div class="text-body-2">
                <strong>Response Time:</strong> We will acknowledge your request within 48 hours and provide a 
                substantive response within 30 calendar days, as required by PIPEDA.
              </div>
            </v-alert>

            <v-form ref="formRef" v-model="formValid" @submit.prevent="submitRequest">
              <v-text-field
                v-model="form.fullName"
                label="Full Name"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
                class="mb-2"
              />

              <v-text-field
                v-model="form.email"
                label="Email Address"
                variant="outlined"
                density="comfortable"
                type="email"
                :rules="[rules.required, rules.email]"
                hint="We will respond to your request at this email address"
                persistent-hint
                class="mb-2"
              />

              <v-text-field
                v-model="form.phone"
                label="Phone Number (optional)"
                variant="outlined"
                density="comfortable"
                class="mb-2"
              />

              <v-select
                v-model="form.requestType"
                label="Request Type"
                variant="outlined"
                density="comfortable"
                :items="requestTypes"
                item-title="title"
                item-value="value"
                :rules="[rules.required]"
                class="mb-2"
              >
                <template v-slot:item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template v-slot:prepend>
                      <v-icon :icon="item.raw.icon" size="20" />
                    </template>
                    <v-list-item-subtitle>{{ item.raw.subtitle }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>

              <v-textarea
                v-model="form.details"
                label="Details of Your Request"
                variant="outlined"
                density="comfortable"
                rows="4"
                :rules="[rules.required]"
                :hint="detailsHint"
                persistent-hint
                class="mb-2"
              />

              <v-checkbox
                v-model="form.identityConfirm"
                :rules="[rules.checked]"
                density="compact"
                class="mb-2"
              >
                <template v-slot:label>
                  <span class="text-body-2">
                    I confirm that I am the individual whose personal information is the subject of this request, 
                    or I am authorized to make this request on their behalf.
                  </span>
                </template>
              </v-checkbox>

              <v-checkbox
                v-model="form.acknowledgeTimeline"
                :rules="[rules.checked]"
                density="compact"
                class="mb-6"
              >
                <template v-slot:label>
                  <span class="text-body-2">
                    I understand that DeelBot will respond within 30 days and may request additional verification of my identity.
                  </span>
                </template>
              </v-checkbox>

              <v-btn
                type="submit"
                color="#8c734b"
                variant="flat"
                size="large"
                block
                :loading="submitting"
                :disabled="!formValid"
                class="text-none font-weight-bold rounded-lg"
              >
                <v-icon icon="mdi-send" class="mr-2" />
                Submit Privacy Request
              </v-btn>
            </v-form>

            <v-divider class="my-8" />

            <div class="text-center">
              <p class="text-body-2 text-grey-darken-1 mb-2">
                You can also contact our Privacy Officer directly:
              </p>
              <p class="text-body-2">
                <v-icon icon="mdi-email-outline" size="16" class="mr-1" />
                <a href="mailto:info@deelbot.com" class="text-primary">info@deelbot.com</a>
                &nbsp;&bull;&nbsp;
                <v-icon icon="mdi-phone-outline" size="16" class="mr-1" />
                <a href="tel:6475637235" class="text-primary">647-563-7235</a>
              </p>
              <p class="text-caption text-grey mt-4">
                If you are not satisfied with our response, you may file a complaint with the 
                <a href="https://www.priv.gc.ca" target="_blank" class="text-primary">Office of the Privacy Commissioner of Canada</a>.
              </p>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

definePageMeta({ layout: 'default' })

const formRef = ref()
const formValid = ref(false)
const submitting = ref(false)
const submitted = ref(false)

const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  requestType: '',
  details: '',
  identityConfirm: false,
  acknowledgeTimeline: false,
})

const rules = {
  required: (v: any) => !!v || 'This field is required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Please enter a valid email',
  checked: (v: boolean) => v === true || 'You must confirm this',
}

const requestTypes = [
  { value: 'access', title: 'Access My Data', subtitle: 'Request a copy of personal information we hold about you', icon: 'mdi-eye' },
  { value: 'correction', title: 'Correct My Data', subtitle: 'Request correction of inaccurate or incomplete information', icon: 'mdi-pencil' },
  { value: 'deletion', title: 'Delete My Data', subtitle: 'Request deletion of your personal information', icon: 'mdi-delete' },
  { value: 'withdraw_consent', title: 'Withdraw Consent', subtitle: 'Withdraw consent for specific data processing activities', icon: 'mdi-hand-back-left' },
  { value: 'restrict', title: 'Restrict Processing', subtitle: 'Request limitation of how your data is processed', icon: 'mdi-pause-circle-outline' },
  { value: 'other', title: 'Other Privacy Inquiry', subtitle: 'General question about our privacy practices', icon: 'mdi-help-circle-outline' },
]

const detailsHint = computed(() => {
  const hints: Record<string, string> = {
    access: 'Describe what personal information you would like to access.',
    correction: 'Describe what information is inaccurate and what the correct information should be.',
    deletion: 'Specify which data you want deleted. Note: some data may be retained for legal obligations.',
    withdraw_consent: 'Specify which consent(s) you wish to withdraw (e.g., marketing, analytics).',
    restrict: 'Describe how you would like your data processing to be restricted.',
    other: 'Describe your privacy-related question or concern.',
  }
  return hints[form.requestType] || 'Provide details about your request.'
})

const submitRequest = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    await $fetch('/api/privacy/request', {
      method: 'POST',
      body: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        requestType: form.requestType,
        details: form.details,
      },
    })
    submitted.value = true
  } catch (error: any) {
    console.error('Failed to submit privacy request:', error)
    alert('Failed to submit your request. Please try again or contact us directly.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

.premium-page-wrapper {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
}

.display-serif-large {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  letter-spacing: -0.03em;
}

.elegant-divider-gold {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #8c734b, #d4af37);
  border-radius: 2px;
}

.premium-badge-light {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: 1px solid rgba(255,255,255,0.2);
}

@media (max-width: 960px) {
  .display-serif-large {
    font-size: 2.5rem;
  }
}
</style>

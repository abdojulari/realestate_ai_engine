<template>
  <v-card flat color="white">
    <v-card-title>
      {{ title }}
    </v-card-title>

    <v-card-text>
      <v-form
        ref="form"
        v-model="isFormValid"
        @submit.prevent="handleSubmit"
      >
        <v-row>
          <!-- Name Fields -->
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="formData.firstName"
              label="First Name"
              :rules="[required]"
              required
              variant="outlined"
              density="compact"
              :disabled="loading"
            />
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field
              v-model="formData.lastName"
              label="Last Name"
              :rules="[required]"
              required
              variant="outlined"
              density="compact"
              :disabled="loading"
            />
          </v-col>

          <!-- Contact Info -->
          <v-col cols="12">
            <v-text-field
              v-model="formData.email"
              label="Email"
              type="email"
              :rules="[required, email]"
              required
              variant="outlined"
              density="compact"
              :disabled="loading"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="formData.phone"
              label="Phone"
              :rules="[phone]"
              variant="outlined"
              density="compact"
              :disabled="loading"
            />
          </v-col>

          <!-- Preferred Contact Time -->
          <v-col cols="12">
            <v-select
              v-model="formData.preferredContactTime"
              :items="contactTimeOptions"
              label="Preferred Contact Time"
              variant="outlined"
              density="compact"
              :disabled="loading"
            />
          </v-col>

          <!-- Message -->
          <v-col cols="12">
            <v-textarea
              v-model="formData.message"
              :label="messageLabel"
              :rules="[required]"
              required
              variant="outlined"
              :rows="4"
              :disabled="loading"
              :auto-grow="true"
              id="contact-form-message"
            />
          </v-col>

          <!-- Additional Fields -->
          <template v-if="showAdditionalFields">
            <!-- Viewing Date/Time -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.viewingDate"
                label="Preferred Date"
                type="date"
                :min="minDate"
                :rules="[required]"
                required
                variant="outlined"
                density="compact"
                :disabled="loading"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.viewingTime"
                :items="viewingTimeSlots"
                label="Preferred Time"
                :rules="[required]"
                required
                variant="outlined"
                density="compact"
                :disabled="loading"
              />
            </v-col>
          </template>

          <!-- Terms Checkbox -->
          <v-col cols="12">
            <v-checkbox
              v-model="formData.agreeToTerms"
              :rules="[v => !!v || 'You must agree to continue']"
              required
              :disabled="loading"
            >
              <template v-slot:label>
                I agree to the
                <a href="/terms" target="_blank" class="text-primary">Terms of Service</a>
                and
                <a href="/privacy" target="_blank" class="text-primary">Privacy Policy</a>
              </template>
            </v-checkbox>
          </v-col>
        </v-row>

        <!-- Submit Button -->
        <v-btn
          type="submit"
          color="primary"
          block
          :loading="loading"
          :disabled="!isFormValid || loading"
        >
          {{ submitButtonText }}
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { required, email, phone } from '../../../utils/validators'

const props = defineProps({
  title: {
    type: String,
    default: 'Contact Us'
  },
  messageLabel: {
    type: String,
    default: 'Message'
  },
  submitButtonText: {
    type: String,
    default: 'Send Message'
  },
  showAdditionalFields: {
    type: Boolean,
    default: false
  },
  initialMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit'])

const form = ref(null)
const loading = ref(false)
const isFormValid = ref(false)

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  preferredContactTime: '',
  message: props.initialMessage,
  viewingDate: '',
  viewingTime: '',
  agreeToTerms: false
})

const contactTimeOptions = [
  'Morning (9AM - 12PM)',
  'Afternoon (12PM - 5PM)',
  'Evening (5PM - 8PM)',
  'Any Time'
]

const viewingTimeSlots = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM'
]

const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

const handleSubmit = async () => {
  const formElement = form.value as any
  const isValid = await formElement?.validate()

  if (!isValid) return

  loading.value = true
  try {
    emit('submit', formData.value)
    formElement?.reset()
  } finally {
    loading.value = false
  }
}

// Reset form
const reset = () => {
  const formElement = form.value as any
  formElement?.reset()
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredContactTime: '',
    message: props.initialMessage,
    viewingDate: '',
    viewingTime: '',
    agreeToTerms: false
  }
}

// Expose reset method
defineExpose({ reset })
</script>

<style scoped>
.v-card-title {
  font-size: 1.5rem;
  font-weight: 500;
}

:deep(.v-text-field .v-field__input) {
  min-height: 44px;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.v-checkbox .v-label) {
  opacity: 1;
}
</style>

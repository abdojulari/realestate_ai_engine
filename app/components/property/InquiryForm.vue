<template>
  <v-card  color="white">
    <v-card-title>
      {{ title }}
    </v-card-title>

    <v-card-text>
      <!-- Agent Info -->
      <div v-if="showAgent" class="agent-info mb-6">
        <v-row align="center">
          <v-col cols="auto">
            <v-avatar
              :image="agent.avatar"
              size="64"
            >
              <v-icon v-if="!agent.avatar" icon="mdi-account" size="32" />
            </v-avatar>
          </v-col>
          <v-col>
            <div class="text-subtitle-1 font-weight-medium">{{ agent.name }}</div>
            <div class="text-body-2">{{ agent.agency }}</div>
            <div class="d-flex align-center mt-1">
              <v-rating
                v-if="agent.rating"
                :model-value="agent.rating"
                color="amber"
                density="compact"
                size="small"
                readonly
              />
              <span v-if="agent.rating" class="text-caption ml-1">
                ({{ agent.reviews }} reviews)
              </span>
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- Quick Actions -->
      <div v-if="showQuickActions" class="quick-actions mb-6">
        <v-row>
          <v-col cols="6">
            <v-btn
              block
              prepend-icon="mdi-phone"
              class="text-capitalize bg-primary text-white"
              density="compact"
              :href="`tel:${agent.phone}`"
            >
              Call Agent
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              block
              prepend-icon="mdi-calendar"
              variant="outlined"
              class="text-capitalize text-primary"
              density="compact"
              @click="showScheduleDialog = true"
            >
              Schedule Viewing
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- Contact Form -->
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

          <!-- Contact Preference -->
          <v-col cols="12">
            <v-select
              v-model="formData.contactMethod"
              :items="contactMethods"
              label="Preferred Contact Method"
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
            />
          </v-col>

          <!-- Terms -->
          <v-col cols="12">
            <v-checkbox
              v-model="formData.agreeToTerms"
              :rules="[v => !!v || 'You must agree to continue']"
              required
              :disabled="loading"
              density="compact"
              variant="outlined"
            >
              <template v-slot:label>
                I agree to the
                <a href="/terms" target="_blank" class="text-primary text-decoration-underline font-weight-bold">Terms of Service</a>
                and
                <a href="/privacy" target="_blank" class="text-primary text-decoration-underline">Privacy Policy</a>
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
          density="compact"
          variant="outlined"
        >
          {{ submitButtonText }}
        </v-btn>
      </v-form>
    </v-card-text>

    <!-- Schedule Viewing Dialog -->
    <v-dialog
      v-model="showScheduleDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title>Schedule a Viewing</v-card-title>
        <v-card-text>
          <v-form v-model="isScheduleFormValid" @submit.prevent="handleSchedule">
            <v-row>
              <v-col cols="12">
                <v-date-picker
                  v-model="scheduleForm.date"
                  class="mb-4"
                  :min="minDate"
                  density="compact"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12">
                <v-select
                  v-model="scheduleForm.time"
                  :items="availableTimes"
                  label="Preferred Time"
                  required
                  variant="outlined"
                  density="compact"
                  :rules="[required]"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="scheduleForm.notes"
                  label="Additional Notes"
                  variant="outlined"
                  density="compact"
                  rows="3"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="outlined"
            density="compact"
            @click="showScheduleDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="schedulingLoading"
            :disabled="!isScheduleFormValid"
            @click="handleSchedule"
            density="compact"
          >
            Schedule Viewing
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { required, email, phone } from '../../../utils/validators'

const props = defineProps({
  title: {
    type: String,
    default: 'Contact Agent'
  },
  messageLabel: {
    type: String,
    default: 'Message'
  },
  submitButtonText: {
    type: String,
    default: 'Send Message'
  },
  showAgent: {
    type: Boolean,
    default: true
  },
  showQuickActions: {
    type: Boolean,
    default: true
  },
  agent: {
    type: Object,
    default: () => ({
      name: '',
      agency: '',
      avatar: '',
      phone: '',
      rating: 0,
      reviews: 0
    })
  },
  propertyId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['submit', 'schedule'])

const form = ref(null)
const loading = ref(false)
const schedulingLoading = ref(false)
const isFormValid = ref(false)
const isScheduleFormValid = ref(false)
const showScheduleDialog = ref(false)

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  contactMethod: 'email',
  message: '',
  agreeToTerms: false
})

const scheduleForm = ref({
  date: '',
  time: '',
  notes: ''
})

const contactMethods = [
  { title: 'Email', value: 'email' },
  { title: 'Phone', value: 'phone' },
  { title: 'Text Message', value: 'sms' }
]

const availableTimes = [
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
    emit('submit', {
      ...formData.value,
      propertyId: props.propertyId
    })
    formElement?.reset()
  } finally {
    loading.value = false
  }
}

const handleSchedule = async () => {
  if (!isScheduleFormValid.value) return

  schedulingLoading.value = true
  try {
    emit('schedule', {
      ...scheduleForm.value,
      propertyId: props.propertyId
    })
    showScheduleDialog.value = false
    scheduleForm.value = {
      date: '',
      time: '',
      notes: ''
    }
  } finally {
    schedulingLoading.value = false
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
    contactMethod: 'email',
    message: '',
    agreeToTerms: false
  }
}

// Expose reset method
defineExpose({ reset })
</script>

<style scoped>
.agent-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
}

:deep(.v-date-picker) {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
</style>

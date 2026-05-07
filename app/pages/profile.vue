<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <span>Profile Information</span>
            <v-spacer />
            <v-btn
              color="primary"
              @click="isEditing = !isEditing"
              :icon="isEditing ? 'mdi-close' : 'mdi-pencil'"
            />
          </v-card-title>

          <v-card-text>
            <v-alert
              v-if="!formData.phone?.trim()"
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-4"
              prominent
            >
              Please add a phone number — saving your profile requires a valid phone so your agent can reach you.
            </v-alert>

            <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field density="compact"
                    v-model="formData.firstName"
                    label="First Name"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="nameRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field density="compact"
                    v-model="formData.lastName"
                    label="Last Name"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="nameRules"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field density="compact"
                    v-model="formData.email"
                    label="Email"
                    type="email"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="emailRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field density="compact"
                    v-model="formData.phone"
                    label="Phone"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="phoneRulesActive"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-menu
                    v-model="contactMenuOpen"
                    :close-on-content-click="false"
                    location="bottom"
                    min-width="360"
                  >
                    <template #activator="{ props: menuProps }">
                      <v-text-field
                        v-bind="menuProps"
                        :model-value="preferredContactSummary || undefined"
                        label="Preferred contact (date & time)"
                        variant="outlined"
                        density="compact"
                        readonly
                        :disabled="!isEditing"
                        placeholder="Select date & time"
                        hint="Saved to your CRM record when you choose a slot"
                        persistent-hint
                        append-inner-icon="mdi-calendar-clock"
                      />
                    </template>
                    <v-card elevation="8" class="pa-4 rounded-lg">
                      <div class="text-subtitle-2 mb-2 text-medium-emphasis">Pick a window</div>
                      <v-date-picker
                        v-model="preferredSlotDate"
                        hide-header
                        class="mb-3 rounded-lg"
                        :min="minContactDate"
                      />
                      <v-select
                        density="comfortable"
                        v-model="preferredSlotTime"
                        :items="contactTimeSlots"
                        item-title="title"
                        item-value="value"
                        label="Time"
                        variant="outlined"
                        hide-details="auto"
                      />
                      <div class="d-flex justify-end gap-2 mt-4">
                        <v-btn size="small" variant="text" @click="clearPreferredSlot">Clear</v-btn>
                        <v-btn size="small" color="primary" variant="flat" @click="contactMenuOpen = false">Done</v-btn>
                      </div>
                    </v-card>
                  </v-menu>
                </v-col>
              </v-row>

              <v-row v-if="isEditing">
                <v-col cols="12">
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="loading"
                    :disabled="!isFormValid"
                  >
                    Save Changes
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title>Saved Searches</v-card-title>
          <v-card-text>
            <v-list v-if="savedSearches.length">
              <v-list-item
                v-for="search in savedSearches"
                :key="search.id"
                :title="formatSearchTitle(search)"
                :subtitle="formatSearchCriteria(search)"
              >
                <template v-slot:append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click="deleteSavedSearch(search.id)"
                  />
                </template>
              </v-list-item>
            </v-list>
            <v-alert
              v-else
              type="info"
              text="You haven't saved any searches yet."
            />
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title>Viewing Requests</v-card-title>
          <v-card-text>
            <v-list v-if="viewingRequests.length">
              <v-list-item
                v-for="request in viewingRequests"
                :key="request.id"
                :title="request.property.title"
                :subtitle="formatViewingDate(request.dateTime)"
              >
                <template v-slot:prepend>
                  <v-chip
                    :color="getStatusColor(request.status)"
                    size="small"
                  >
                    {{ request.status }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            <v-alert
              v-else
              type="info"
              text="You haven't requested any viewings yet."
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="feedback.show" :color="feedback.color" :timeout="4000" location="bottom right">
      <v-icon :icon="feedback.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" class="mr-2" />
      {{ feedback.message }}
      <template #actions>
        <v-btn variant="text" @click="feedback.show = false">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const auth = useAuthStore()
const api = useApi()

const isEditing = ref(false)
const loading = ref(false)
const isFormValid = ref(false)
const savedSearches = ref<any[]>([])
const viewingRequests = ref<any[]>([])
const contactMenuOpen = ref(false)

const preferredSlotDate = ref('')
const preferredSlotTime = ref('09:00')

const contactTimeSlots = [
  { title: '8:00 AM', value: '08:00' },
  { title: '8:30 AM', value: '08:30' },
  { title: '9:00 AM', value: '09:00' },
  { title: '9:30 AM', value: '09:30' },
  { title: '10:00 AM', value: '10:00' },
  { title: '10:30 AM', value: '10:30' },
  { title: '11:00 AM', value: '11:00' },
  { title: '11:30 AM', value: '11:30' },
  { title: '12:00 PM', value: '12:00' },
  { title: '12:30 PM', value: '12:30' },
  { title: '1:00 PM', value: '13:00' },
  { title: '1:30 PM', value: '13:30' },
  { title: '2:00 PM', value: '14:00' },
  { title: '2:30 PM', value: '14:30' },
  { title: '3:00 PM', value: '15:00' },
  { title: '3:30 PM', value: '15:30' },
  { title: '4:00 PM', value: '16:00' },
  { title: '4:30 PM', value: '16:30' },
  { title: '5:00 PM', value: '17:00' },
  { title: '5:30 PM', value: '17:30' },
  { title: '6:00 PM', value: '18:00' },
  { title: '6:30 PM', value: '18:30' },
  { title: '7:00 PM', value: '19:00' },
]

const minContactDate = computed(() => new Date().toISOString().split('T')[0])

const feedback = reactive({
  show: false,
  color: 'success' as 'success' | 'error',
  message: '',
})
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  feedback.message = message
  feedback.color = color
  feedback.show = true
}
const describeError = (e: any, fallback: string) =>
  e?.data?.statusMessage || e?.statusMessage || e?.message || fallback

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  preferredContactTime: '',
})

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters',
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const phoneRulesOptional = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number',
]

const phoneRulesRequired = [
  (v: string) => !!v?.trim() || 'Phone is required',
  (v: string) => /^\+?[\d\s-]{10,}$/.test(v?.trim() || '') || 'Please enter a valid phone number',
]

const phoneRulesActive = computed(() => (isEditing.value ? phoneRulesRequired : phoneRulesOptional))

function hydratePreferredSlot(raw?: string | null) {
  preferredSlotDate.value = ''
  preferredSlotTime.value = '09:00'
  if (!raw?.trim()) return
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  preferredSlotDate.value = `${y}-${m}-${d}`
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  preferredSlotTime.value = `${hh}:${mm}`
}

function preferredSlotToIso(): string | null {
  if (!preferredSlotDate.value || !preferredSlotTime.value) return null
  const isoLocal = `${preferredSlotDate.value}T${preferredSlotTime.value}:00`
  const dt = new Date(isoLocal)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

const preferredContactSummary = computed(() => {
  const raw = formData.value.preferredContactTime?.trim()
  if (!raw) return ''
  const dt = new Date(raw)
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }
  return raw
})

watch([preferredSlotDate, preferredSlotTime], () => {
  const iso = preferredSlotToIso()
  if (iso) {
    formData.value.preferredContactTime = iso
  }
})

function clearPreferredSlot() {
  preferredSlotDate.value = ''
  preferredSlotTime.value = '09:00'
  formData.value.preferredContactTime = ''
}

onMounted(async () => {
  if (auth.user) {
    formData.value = {
      firstName: auth.user.firstName || '',
      lastName: auth.user.lastName || '',
      email: auth.user.email || '',
      phone: auth.user.phone || '',
      preferredContactTime: (auth.user as any).preferredContactTime || '',
    }
    hydratePreferredSlot(formData.value.preferredContactTime)
    await loadSavedSearches()
    await loadViewingRequests()
  }
})

const handleSubmit = async () => {
  loading.value = true
  try {
    const payload = {
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email,
      phone: formData.value.phone?.trim() || '',
      preferredContactTime: formData.value.preferredContactTime?.trim() || '',
    }
    const updated = await api.put<any>('/user/profile', payload)
    if (updated) {
      auth.setUser({
        ...auth.user!,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        preferredContactTime: updated.preferredContactTime,
      } as any)
      formData.value.preferredContactTime = updated.preferredContactTime || ''
      hydratePreferredSlot(formData.value.preferredContactTime)
      isEditing.value = false
      notify('Profile updated.', 'success')
    }
  } catch (error) {
    console.error('Update profile error:', error)
    notify(describeError(error, 'Could not update your profile.'), 'error')
  } finally {
    loading.value = false
  }
}

const loadSavedSearches = async () => {
  try {
    const response = await api.get<any[]>('/user/saved-searches')
    savedSearches.value = Array.isArray(response) ? response : []
  } catch (error) {
    console.error('Load saved searches error:', error)
    notify(describeError(error, 'Could not load your saved searches.'), 'error')
  }
}

const loadViewingRequests = async () => {
  try {
    const response = await api.get<any[]>('/user/viewing-requests')
    viewingRequests.value = Array.isArray(response) ? response : []
  } catch (error) {
    console.error('Load viewing requests error:', error)
    notify(describeError(error, 'Could not load your viewing requests.'), 'error')
  }
}

const deleteSavedSearch = async (id: number) => {
  try {
    await api.del(`/user/saved-searches/${id}`)
    savedSearches.value = savedSearches.value.filter((search) => search.id !== id)
    notify('Saved search removed.', 'success')
  } catch (error) {
    console.error('Delete saved search error:', error)
    notify(describeError(error, 'Could not delete this saved search.'), 'error')
  }
}

const formatSearchTitle = (search: any) => {
  const filters = search.filters || {}
  return `${filters.city || 'Any City'} - ${filters.propertyType || 'Any Type'}`
}

const formatSearchCriteria = (search: any) => {
  const filters = search.filters || {}
  const beds = filters.beds ?? '—'
  const baths = filters.baths ?? '—'
  const pr = filters.priceRange
  let price = 'Any price'
  if (Array.isArray(pr) && pr.length >= 2) {
    price = `$${pr[0]}-${pr[1]}`
  }
  return `${beds}+ beds, ${baths}+ baths, ${price}`
}

const formatViewingDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    completed: 'info',
  }
  return colors[status as keyof typeof colors] || 'grey'
}
</script>

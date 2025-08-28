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
            <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.firstName"
                    label="First Name"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="nameRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.lastName"
                    label="Last Name"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="nameRules"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="formData.email"
                    label="Email"
                    type="email"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="emailRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.phone"
                    label="Phone"
                    :readonly="!isEditing"
                    variant="outlined"
                    :rules="phoneRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.preferredContactTime"
                    :items="contactTimeOptions"
                    label="Preferred Contact Time"
                    :readonly="!isEditing"
                    variant="outlined"
                  />
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
  </v-container>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
const auth = useAuth()
const { $fetch } = useNuxtApp()

const isEditing = ref(false)
const loading = ref(false)
const isFormValid = ref(false)
const savedSearches = ref([])
const viewingRequests = ref([])

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  preferredContactTime: ''
})

const contactTimeOptions = [
  'Morning (9AM - 12PM)',
  'Afternoon (12PM - 5PM)',
  'Evening (5PM - 8PM)',
  'Any Time'
]

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

// Load user data
onMounted(async () => {
  if (auth.user) {
    formData.value = { ...(auth.user as any) }
    await loadSavedSearches()
    await loadViewingRequests()
  }
})

const handleSubmit = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/user/profile', {
      method: 'PUT',
      body: formData.value
    })
    if (response) {
      // reflect server response if needed
      isEditing.value = false
    }
  } catch (error) {
    console.error('Update profile error:', error)
  } finally {
    loading.value = false
  }
}

const loadSavedSearches = async () => {
  try {
    const response = await $fetch('/api/user/saved-searches')
    savedSearches.value = response
  } catch (error) {
    console.error('Load saved searches error:', error)
  }
}

const loadViewingRequests = async () => {
  try {
    const response = await $fetch('/api/user/viewing-requests')
    viewingRequests.value = response
  } catch (error) {
    console.error('Load viewing requests error:', error)
  }
}

const deleteSavedSearch = async (id: number) => {
  try {
    await $fetch(`/api/user/saved-searches/${id}`, {
      method: 'DELETE'
    })
    savedSearches.value = savedSearches.value.filter(search => search.id !== id)
  } catch (error) {
    console.error('Delete saved search error:', error)
  }
}

const formatSearchTitle = (search: any) => {
  const filters = search.filters
  return `${filters.city || 'Any City'} - ${filters.propertyType || 'Any Type'}`
}

const formatSearchCriteria = (search: any) => {
  const filters = search.filters
  return `${filters.beds}+ beds, ${filters.baths}+ baths, $${filters.priceRange[0]}-${filters.priceRange[1]}`
}

const formatViewingDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    completed: 'info'
  }
  return colors[status as keyof typeof colors] || 'grey'
}
</script>

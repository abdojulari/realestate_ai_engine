<!--- -->
<template>
  <div class="saved-properties">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col>
          <h1 class="text-h4">Saved Properties</h1>
          <p class="text-subtitle-1">Manage your favorite properties</p>
        </v-col>
      </v-row>

      <!-- Search and Filter -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="search"
            label="Search properties"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            hide-details
            class="mb-4 mb-md-0"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            label="Sort by"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="propertyType"
            :items="propertyTypes"
            label="Property type"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Properties Grid -->
      <v-row>
        <v-col
          v-for="property in filteredProperties"
          :key="property.id"
          cols="12"
          md="6"
          lg="4"
        >
          <PropertyCard
            :property="property"
            :show-remove="true"
            @click="viewProperty(property)"
            @save="toggleSave(property)"
            @contact="contactAgent(property)"
          />
        </v-col>
      </v-row>

      <!-- Empty State -->
      <div
        v-if="properties.length === 0"
        class="text-center py-12"
      >
        <v-icon
          icon="mdi-heart-outline"
          size="64"
          color="grey-lighten-1"
          class="mb-4"
        />
        <div class="text-h5 text-grey-darken-1">No saved properties</div>
        <div class="text-body-1 text-grey-darken-1 mb-4">
          Start saving properties you're interested in to keep track of them
        </div>
        <v-btn
          color="primary"
          to="/map-search"
        >
          Browse Properties
        </v-btn>
      </div>

      <!-- Loading State -->
      <v-row v-if="loading">
        <v-col cols="12" class="text-center">
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="totalPages > 1" class="mt-6">
        <v-col cols="12" class="text-center">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
          />
        </v-col>
      </v-row>
    </v-container>

    <!-- Contact Dialog -->
    <v-dialog
      v-model="showContactDialog"
      max-width="600"
    >
      <InquiryForm
        v-if="selectedProperty"
        :property-id="selectedProperty.id"
        :agent="selectedProperty.agent"
        @submit="handleInquiry"
        @schedule="handleSchedule"
      />
    </v-dialog>

    <!-- Remove Confirmation Dialog -->
    <v-dialog
      v-model="showRemoveDialog"
      max-width="400"
    >
      <v-card flat color="white">
        <v-card-title>Remove Property</v-card-title>
        <v-card-text>
          Are you sure you want to remove this property from your saved list?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showRemoveDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="confirmRemove"
          >
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { propertyService } from '~/services/property.service'

// State
const loading = ref(false)
const properties = ref([])
const search = ref('')
const sortBy = ref('newest')
const propertyType = ref('all')
const currentPage = ref(1)
const itemsPerPage = 12
const showContactDialog = ref(false)
const showRemoveDialog = ref(false)
const selectedProperty = ref(null)
const propertyToRemove = ref(null)

// Options
const sortOptions = [
  { title: 'Newest First', value: 'newest' },
  { title: 'Price (Low to High)', value: 'price_asc' },
  { title: 'Price (High to Low)', value: 'price_desc' },
  { title: 'Most Popular', value: 'popular' }
]

const propertyTypes = [
  { title: 'All Properties', value: 'all' },
  { title: 'Houses', value: 'house' },
  { title: 'Condos', value: 'condo' },
  { title: 'Townhouses', value: 'townhouse' },
  { title: 'Land', value: 'land' }
]

// Computed
const filteredProperties = computed(() => {
  let filtered = [...properties.value]

  // Apply search filter
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    filtered = filtered.filter(property => {
      return (
        property.title.toLowerCase().includes(searchTerm) ||
        property.address.toLowerCase().includes(searchTerm) ||
        property.description.toLowerCase().includes(searchTerm)
      )
    })
  }

  // Apply property type filter
  if (propertyType.value !== 'all') {
    filtered = filtered.filter(property => property.type === propertyType.value)
  }

  // Apply sorting
  switch (sortBy.value) {
    case 'price_asc':
      filtered.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      filtered.sort((a, b) => b.price - a.price)
      break
    case 'popular':
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0))
      break
    default:
      // newest first
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return filtered
})

const totalPages = computed(() => {
  return Math.ceil(filteredProperties.value.length / itemsPerPage)
})

const paginatedProperties = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProperties.value.slice(start, end)
})

// Methods
const loadProperties = async () => {
  loading.value = true
  try {
    const response = await propertyService.getSavedProperties()
    const { filterResidentialProperties } = await import('../../../utils/propertyFilters')
    properties.value = filterResidentialProperties(response)
  } catch (error) {
    console.error('Error loading saved properties:', error)
    // Show error message
  } finally {
    loading.value = false
  }
}

const viewProperty = (property: any) => {
  navigateTo(`/property/${property.id}`)
}

const toggleSave = (property: any) => {
  propertyToRemove.value = property
  showRemoveDialog.value = true
}

const confirmRemove = async () => {
  try {
    await propertyService.toggleSave(propertyToRemove.value!.id)
    properties.value = properties.value.filter(p => p.id !== propertyToRemove.value!.id)
    showRemoveDialog.value = false
    propertyToRemove.value = null
  } catch (error) {
    console.error('Error removing property:', error)
    // Show error message
  }
}

const contactAgent = (property: any) => {
  selectedProperty.value = property
  showContactDialog.value = true
}

const handleInquiry = async (data: any) => {
  try {
    // Handle inquiry submission
    showContactDialog.value = false
  } catch (error) {
    console.error('Error submitting inquiry:', error)
    // Show error message
  }
}

const handleSchedule = async (data: any) => {
  try {
    await propertyService.requestViewing(selectedProperty.value!.id, data)
    showContactDialog.value = false
  } catch (error) {
    console.error('Error scheduling viewing:', error)
    // Show error message
  }
}

// Watch for filter changes to reset pagination
watch([search, sortBy, propertyType], () => {
  currentPage.value = 1
})

// Load initial data
onMounted(() => {
  loadProperties()
})

// Define page meta
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})
</script>

<style scoped>
.saved-properties {
  min-height: calc(100vh - 64px);
}
</style>

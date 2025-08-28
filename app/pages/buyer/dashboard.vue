<template>
  <div class="buyer-dashboard">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col>
          <h1 class="text-h4">My Dashboard</h1>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ savedProperties.length }}</div>
              <div class="text-subtitle-1">Saved Properties</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ viewingRequests.length }}</div>
              <div class="text-subtitle-1">Viewing Requests</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ savedSearches.length }}</div>
              <div class="text-subtitle-1">Saved Searches</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Saved Properties -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              Saved Properties
              <v-spacer />
              <v-text-field
                v-model="propertySearch"
                append-inner-icon="mdi-magnify"
                label="Search properties"
                density="compact"
                hide-details
                class="max-w-xs"
              />
            </v-card-title>

            <v-card-text>
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
                    @click="viewProperty(property)"
                    @save="toggleSave(property)"
                    @contact="contactAgent(property)"
                  />
                </v-col>
              </v-row>

              <div
                v-if="savedProperties.length === 0"
                class="text-center py-8"
              >
                <v-icon
                  icon="mdi-home-search"
                  size="64"
                  color="grey-lighten-1"
                  class="mb-4"
                />
                <div class="text-h6 text-grey-darken-1">No saved properties yet</div>
                <div class="text-body-1 text-grey-darken-1 mb-4">
                  Start browsing properties and save your favorites
                </div>
                <v-btn
                  color="primary"
                  to="/map-search"
                >
                  Browse Properties
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Viewing Requests -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>Viewing Requests</v-card-title>

            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="request in viewingRequests"
                    :key="request.id"
                  >
                    <td>
                      <div class="d-flex align-center">
                        <v-img
                          :src="request.property.images[0]"
                          width="60"
                          height="40"
                          cover
                          class="rounded mr-2"
                        />
                        <div>
                          <div class="font-weight-medium">
                            {{ request.property.title }}
                          </div>
                          <div class="text-caption text-grey">
                            {{ request.property.address }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {{ formatDateTime(request.dateTime) }}
                    </td>
                    <td>
                      <v-chip
                        :color="getStatusColor(request.status)"
                        size="small"
                      >
                        {{ request.status }}
                      </v-chip>
                    </td>
                    <td>
                      <v-btn
                        icon="mdi-eye"
                        variant="text"
                        size="small"
                        :to="`/property/${request.property.id}`"
                      />
                      <v-btn
                        v-if="request.status === 'pending'"
                        icon="mdi-close"
                        variant="text"
                        size="small"
                        color="error"
                        @click="cancelViewing(request)"
                      />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div
                v-if="viewingRequests.length === 0"
                class="text-center py-8"
              >
                <v-icon
                  icon="mdi-calendar-blank"
                  size="64"
                  color="grey-lighten-1"
                  class="mb-4"
                />
                <div class="text-h6 text-grey-darken-1">No viewing requests</div>
                <div class="text-body-1 text-grey-darken-1">
                  Schedule a viewing when you find a property you like
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Saved Searches -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Saved Searches</v-card-title>

            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="search in savedSearches"
                  :key="search.id"
                  :title="getSearchTitle(search.filters)"
                  :subtitle="formatDate(search.createdAt)"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-magnify"
                      variant="text"
                      size="small"
                      @click="runSearch(search)"
                    />
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click="deleteSearch(search)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <div
                v-if="savedSearches.length === 0"
                class="text-center py-8"
              >
                <v-icon
                  icon="mdi-magnify"
                  size="64"
                  color="grey-lighten-1"
                  class="mb-4"
                />
                <div class="text-h6 text-grey-darken-1">No saved searches</div>
                <div class="text-body-1 text-grey-darken-1">
                  Save your search criteria to get notified about new properties
                </div>
              </div>
            </v-card-text>
          </v-card>
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
  </div>
</template>

<script setup lang="ts">
// Nuxt 4 auto-imports: ref, computed, onMounted, definePageMeta, navigateTo
import { propertyService } from '~/services/property.service'
import { formatDateTime, formatDate } from '../../../utils/formatters'
import type { Property, ViewingRequest, SavedSearch } from '~/types'

// State
const propertySearch = ref('')
const savedProperties = ref<Property[]>([])
const viewingRequests = ref<ViewingRequest[]>([])
const savedSearches = ref<SavedSearch[]>([])
const showContactDialog = ref(false)
const selectedProperty = ref<Property | null>(null)

// Computed
const filteredProperties = computed(() => {
  if (!propertySearch.value) return savedProperties.value

  const search = propertySearch.value.toLowerCase()
  return savedProperties.value.filter((property: Property) => {
    return (
      property.title.toLowerCase().includes(search) ||
      property.address.toLowerCase().includes(search) ||
      property.description.toLowerCase().includes(search)
    )
  })
})

// Methods
const loadData = async () => {
  try {
    const [properties, requests, searches] = await Promise.all([
      propertyService.getSavedProperties(),
      propertyService.getMyViewingRequests(),
      // Add saved search service
      []
    ])

    savedProperties.value = properties
    viewingRequests.value = requests
    savedSearches.value = searches
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    // Show error message
  }
}

const viewProperty = (property: Property) => {
  navigateTo(`/property/${property.id}`)
}

const toggleSave = async (property: Property) => {
  try {
    await propertyService.toggleSave(property.id)
    property.isSaved = !property.isSaved
    if (!property.isSaved) {
      savedProperties.value = savedProperties.value.filter(p => p.id !== property.id)
    }
  } catch (error) {
    console.error('Error toggling save:', error)
    // Show error message
  }
}

const contactAgent = (property: Property) => {
  selectedProperty.value = property
  showContactDialog.value = true
}

interface InquiryData {
  message: string;
  type: 'inquiry' | 'viewing';
  preferredContactTime?: string;
}

const handleInquiry = async (data: InquiryData) => {
  try {
    // Handle inquiry submission
    showContactDialog.value = false
  } catch (error) {
    console.error('Error submitting inquiry:', error)
    // Show error message
  }
}

interface ScheduleData {
  dateTime: string;
  message?: string;
}

const handleSchedule = async (data: ScheduleData) => {
  if (!selectedProperty.value) return
  
  try {
    await propertyService.requestViewing(selectedProperty.value.id, data)
    showContactDialog.value = false
    await loadData() // Refresh viewing requests
  } catch (error) {
    console.error('Error scheduling viewing:', error)
    // Show error message
  }
}

const cancelViewing = async (request: ViewingRequest) => {
  try {
    await propertyService.updateViewingRequest(request.id, { status: 'cancelled' } as Partial<ViewingRequest>)
    await loadData() // Refresh viewing requests
  } catch (error) {
    console.error('Error cancelling viewing:', error)
    // Show error message
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    completed: 'info',
    cancelled: 'grey'
  }
  return colors[status] || 'grey'
}

interface PropertyFilter {
  location?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
}

const getSearchTitle = (filters: PropertyFilter) => {
  const parts = []
  if (filters.location) parts.push(filters.location)
  if (filters.propertyType) parts.push(filters.propertyType)
  if (filters.minPrice || filters.maxPrice) {
    const price = []
    if (filters.minPrice) price.push(`$${filters.minPrice.toLocaleString()}`)
    if (filters.maxPrice) price.push(`$${filters.maxPrice.toLocaleString()}`)
    parts.push(`Price: ${price.join(' - ')}`)
  }
  if (filters.beds) parts.push(`${filters.beds}+ beds`)
  if (filters.baths) parts.push(`${filters.baths}+ baths`)
  return parts.join(' • ') || 'Unnamed Search'
}

const runSearch = (search: SavedSearch) => {
  navigateTo({
    path: '/map-search',
    query: search.filters as any
  })
}

const deleteSearch = async (search: SavedSearch) => {
  try {
    // Add saved search service
    savedSearches.value = savedSearches.value.filter(s => s.id !== search.id)
  } catch (error) {
    console.error('Error deleting search:', error)
    // Show error message
  }
}

// Load initial data
onMounted(() => {
  loadData()
})

// Define page meta
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})
</script>

<style scoped>
.buyer-dashboard {
  min-height: calc(100vh - 64px);
}

.max-w-xs {
  max-width: 300px;
}
</style>
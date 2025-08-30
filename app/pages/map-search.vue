<template>
  <div class="map-search">
    <!-- Search Panel -->
    <div class="search-panel" :class="{ 'panel-expanded': showPanel }">
      <div class="panel-header">
        <v-btn
          icon="mdi-menu"
          variant="text"
          @click="showPanel = !showPanel"
          class="d-md-none"
        />
        <h1 class="text-h5">Property Search</h1>
      </div>

      <div class="panel-content">
        <!-- Search Filters -->
        <SearchFilters
          :initial-filters="filters"
          @search="handleSearch"
          @update:filters="updateFilters"
          variant="outlined"
          density="compact"
        />

        <v-divider class="my-4" />

        <!-- Search Results -->
        <div class="search-results">
          <div class="d-flex align-center mb-4">
            <div class="text-h6">
              {{ properties.length }} Properties Found
            </div>
            <v-spacer />
            <v-select
              v-model="sortBy"
              :items="sortOptions"
              label="Sort by"
              density="compact"
              hide-details
              class="sort-select"
              variant="outlined"
            />
          </div>

          <!-- Property List -->
          <div class="property-list">
            <PropertyCard
              v-for="property in sortedProperties"
              :key="property.id"
              :property="property"
              class="mb-4"
              @click="selectProperty(property)"
              @save="toggleSave(property)"
              @contact="contactAgent(property)"
            />
          </div>

          <!-- Pagination -->
          <div class="text-center mt-4">
            <v-pagination
              v-if="totalPages > 1"
              v-model="currentPage"
              :length="totalPages"
              :total-visible="5"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Map -->
    <div class="map-container">
      <PropertyMap
        :properties="properties"
        :selected-property="selectedProperty"
        @bounds-updated="handleBoundsUpdate"
        @marker-click="selectProperty"
      />

      <!-- Selected Property Card -->
      <v-slide-y-transition>
        <div v-if="selectedProperty" class="selected-property-card">
          <PropertyCard
            :property="selectedProperty"
            :show-contact-button="true"
            @save="toggleSave(selectedProperty)"
            @contact="contactAgent(selectedProperty)"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            class="close-btn"
            @click="selectedProperty = null"
          />
        </div>
      </v-slide-y-transition>
    </div>

    <!-- Contact Dialog -->
    <v-dialog
      v-model="showContactDialog"
      max-width="600"
    >
      <InquiryForm
        v-if="contactProperty"
        :property-id="contactProperty.id"
        :agent="contactProperty.agent"
        @submit="handleInquiry"
        @schedule="handleSchedule"
      />
    </v-dialog>

    <!-- Loading Overlay -->
    <LoadingState
      v-if="loading"
      message="Loading properties..."
      overlay
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Property as BaseProperty, PropertyFilter, User } from '~/types'
import { useAnalytics } from '../../utils/analytics'
import { propertyService } from '~/services/property.service'

interface Property extends BaseProperty {
  isSaved: boolean;
  agent: User;
}

const loading = ref(false)
const showPanel = ref(true)
const selectedProperty = ref<Property | null>(null)
const showContactDialog = ref(false)
const contactProperty = ref<Property | null>(null)
const currentPage = ref(1)
const itemsPerPage = 10

const filters = ref<PropertyFilter>({
  location: '',
  propertyType: '',
  minPrice: 0,
  maxPrice: 0,
  beds: 0,
  baths: 0,
  minSqft: 0,
  maxSqft: 0,
  features: [],
  status: null as any
})

const sortBy = ref('newest')
const sortOptions = [
  { title: 'Newest First', value: 'newest' },
  { title: 'Price (Low to High)', value: 'price_asc' },
  { title: 'Price (High to Low)', value: 'price_desc' },
  { title: 'Most Popular', value: 'popular' }
]

// Properties come from API (no mocks)
const properties = ref<Property[]>([])

const sortedProperties = computed(() => {
  let sorted = [...properties.value]
  switch (sortBy.value) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'popular':
      sorted.sort((a, b) => (b.views || 0) - (a.views || 0))
      break
    default:
      // newest first
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return sorted
})

const totalPages = computed(() => {
  return Math.ceil(properties.value.length / itemsPerPage)
})

const handleSearch = async (searchParams: PropertyFilter) => {
  loading.value = true
  console.log('🔍 Map search called with params:', searchParams) // Debug log
  
  try {
    const data = await propertyService.search(searchParams)
    console.log('✅ Search completed, found:', data.length, 'properties') // Debug log
    
    // Ensure agent/isSaved shape as expected by view
    properties.value = data.map((p: any) => ({
      ...p,
      isSaved: Boolean(p.isSaved),
      agent: p.agent || p.user
    }))
    
    console.log('📍 Properties with coordinates:', properties.value.filter(p => p.latitude && p.longitude).length) // Debug log
  } catch (error) {
    console.error('❌ Search error:', error)
  } finally {
    loading.value = false
  }
}

const updateFilters = (newFilters: PropertyFilter) => {
  filters.value = newFilters
  handleSearch(newFilters)
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const handleBoundsUpdate = (bounds: MapBounds) => {
  handleSearch({ ...filters.value, bounds })
}

const selectProperty = (property: Property) => {
  selectedProperty.value = property
}

const toggleSave = async (property: Property) => {
  try {
    // Replace with actual API call
    // await fetch(`/api/properties/${property.id}/save`, {
    //   method: property.isSaved ? 'DELETE' : 'POST'
    // })
    property.isSaved = !property.isSaved
  } catch (error) {
    console.error('Error toggling save:', error)
  }
}

const contactAgent = (property: Property) => {
  contactProperty.value = property
  showContactDialog.value = true
}

interface InquiryData {
  message: string;
  type: 'inquiry' | 'viewing';
  preferredContactTime?: string;
}

const handleInquiry = async (data: InquiryData) => {
  try {
    // Replace with actual API call
    // await fetch('/api/inquiries', {
    //   method: 'POST',
    //   body: JSON.stringify(data)
    // })
    showContactDialog.value = false
  } catch (error) {
    console.error('Error submitting inquiry:', error)
  }
}

interface ScheduleData {
  dateTime: string;
  message?: string;
}

const handleSchedule = async (data: ScheduleData) => {
  try {
    // Replace with actual API call
    // await fetch('/api/viewings', {
    //   method: 'POST',
    //   body: JSON.stringify(data)
    // })
    showContactDialog.value = false
  } catch (error) {
    console.error('Error scheduling viewing:', error)
  }
}

// Track page views
onMounted(async () => {
  const analytics = useAnalytics()
  analytics.trackPageView({
    path: '/map-search',
    title: 'Property Search'
  })
  // Initial load from API
  await handleSearch(filters.value)
})
</script>

<style scoped>
.map-search {
  display: flex;
  height: calc(100vh - 64px); /* Adjust based on header height */
}

.search-panel {
  width: 400px;
  background: white;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.map-container {
  flex: 1;
  position: relative;
}

.selected-property-card {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  max-width: 400px;
  margin: auto;
  z-index: 1;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.sort-select {
  width: 200px;
}

@media (max-width: 960px) {
  .search-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    transform: translateX(-100%);
  }

  .search-panel.panel-expanded {
    transform: translateX(0);
  }

  .selected-property-card {
    left: 16px;
    right: 16px;
  }
}
</style>

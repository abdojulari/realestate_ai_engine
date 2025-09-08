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
        <!-- City Selection -->
        <div class="mb-4">
          <CitySelector
            v-model="selectedCity"
            @city-selected="handleCitySelected"
          />
          
          <v-alert 
            v-if="selectedCity"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
            prepend-icon="mdi-information"
          >
            Showing properties in <strong>{{ selectedCity }}</strong>
            <template v-slot:append>
              <v-btn
                size="small"
                variant="text"
                @click="clearCitySelection"
              >
                Show All
              </v-btn>
            </template>
          </v-alert>
        </div>

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
            <div class="text-body-1">
              <strong>{{ sortedProperties.length }}</strong> properties found
              <span v-if="selectedCity" class="text-medium-emphasis">in {{ selectedCity }}</span>
              <br>
              <span class="text-caption text-medium-emphasis">
                Page {{ currentPage }} of {{ totalPages }} • Showing {{ paginatedProperties.length }} per page
              </span>
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
            <v-skeleton-loader
              v-if="initialLoading || loading"
              type="card"
              :loading="initialLoading || loading"
              class="mb-4"
              v-for="n in 3"
              :key="n"
            />
            
            <PropertyCard
              v-else
              v-for="property in paginatedProperties"
              :key="property.id"
              :property="property"
              class="mb-4"
              @click="selectProperty(property)"
              @save="toggleSave(property)"
              @contact="contactAgent(property)"
            />

          </div>

          <!-- Clean Pagination Controls -->
          <div v-if="totalPages > 1" class="d-flex align-center justify-center gap-2 mt-6">
            <!-- Previous Button -->
            <v-btn
              :disabled="currentPage === 1"
              variant="outlined"
              size="small"
              @click="goToPage(currentPage - 1)"
            >
              <v-icon>mdi-chevron-left</v-icon>
              Previous
            </v-btn>

            <!-- Page Numbers (only show current and optionally next) -->
            <div class="d-flex align-center gap-1">
              <v-chip 
                color="primary" 
                variant="flat" 
                size="small"
                class="px-3"
              >
                {{ currentPage }}
              </v-chip>
              
              <span class="text-caption text-medium-emphasis px-2">of</span>
              
              <v-chip 
                variant="outlined" 
                size="small"
                class="px-3"
              >
                {{ totalPages }}
              </v-chip>
            </div>

            <!-- Next Button -->
            <v-btn
              :disabled="currentPage === totalPages"
              variant="outlined"
              size="small"
              @click="goToPage(currentPage + 1)"
            >
              Next
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
            
            <!-- Results Summary -->
            <div v-if="sortedProperties.length > 0" class="mt-4">
              <v-chip 
                variant="outlined" 
                color="primary" 
                size="small"
              >
                <v-icon start size="small">mdi-information</v-icon>
                {{ ((currentPage - 1) * itemsPerPage) + 1 }}-{{ Math.min(currentPage * itemsPerPage, sortedProperties.length) }} of {{ sortedProperties.length }} properties
              </v-chip>
            </div>

            <!-- No Results -->
            <div v-if="!initialLoading && !loading && sortedProperties.length === 0" class="text-center py-8">
              <v-icon size="64" color="grey" class="mb-4">mdi-home-search</v-icon>
              <h3 class="text-h6 mb-2">No Properties Found</h3>
              <p class="text-body-2 text-medium-emphasis mb-4">
                <span v-if="selectedCity">No properties match your criteria in {{ selectedCity }}</span>
                <span v-else>Try adjusting your search filters</span>
              </p>
              <v-btn 
                v-if="selectedCity" 
                variant="outlined"
                @click="clearCitySelection"
              >
                <v-icon start>mdi-refresh</v-icon>
                Show All Cities
              </v-btn>
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
      color="white"
    >
      <InquiryForm
        v-if="contactProperty"
        :property-id="contactProperty.id"
        :agent="contactProperty.agent"
        @submit="handleInquiry"
        @schedule="handleSchedule"
      />
    </v-dialog>

    <!-- Loading Overlay - Only show on initial load or explicit searches -->
    <LoadingState
      v-if="initialLoading || loading"
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
import { usePropertyService } from '~/composables/usePropertyService'
import { filterResidentialProperties } from '../../utils/propertyFilters'

interface Property extends BaseProperty {
  isSaved: boolean;
  agent: User;
}

interface City {
  name: string
  count: number
  province: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  stats: {
    avgPrice: number
    minPrice: number
    maxPrice: number
    avgSqft: number
  }
}

const loading = ref(false)
const initialLoading = ref(true) // For initial page load
const loadingMore = ref(false)
const showPanel = ref(true)
const selectedProperty = ref<Property | null>(null)
const showContactDialog = ref(false)
const contactProperty = ref<Property | null>(null)
const currentPage = ref(1)
const itemsPerPage = 10  // Show 10 properties per page
const loadMoreEnabled = ref(false)  // Use traditional pagination instead of "Load More"
const selectedCity = ref('')
const totalProperties = ref(0)
let boundsUpdateTimeout: NodeJS.Timeout | null = null

// Service worker integration
const { registerServiceWorker, loadCities, loadCityProperties, searchProperties } = usePropertyService()

const filters = ref<PropertyFilter>({
  location: '',
  city: '',
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

// Paginated properties for display
const paginatedProperties = computed(() => {
  // Traditional pagination - show only current page
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return sortedProperties.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(sortedProperties.value.length / itemsPerPage)
})

const handleSearch = async (searchParams: PropertyFilter, showLoadingState: boolean = true) => {
  if (showLoadingState) {
    loading.value = true
  }
  console.log('🔍 Map search called with params:', searchParams)
  
  try {
    let data: any[] = []
    
    // Map needs ALL properties, not paginated results
    // Add a high limit to get all properties for map display
    // Filter out commercial and industrial properties - only show residential
    const mapSearchParams = {
      ...searchParams,
      limit: 10000 // High limit to get all properties for map
    }
    
    data = await propertyService.search(mapSearchParams)
    
    // Filter out commercial and industrial properties - only show residential
    data = filterResidentialProperties(data)
    
    totalProperties.value = data.length
    
    console.log('🔍 Applied filters:', {
      city: searchParams.city,
      type: searchParams.propertyType || searchParams.type,
      minPrice: searchParams.minPrice,
      maxPrice: searchParams.maxPrice,
      beds: searchParams.beds,
      baths: searchParams.baths
    })
    
    console.log('✅ Search completed, found:', data.length, 'residential properties (filtered out commercial/industrial)')
    
    // Ensure agent/isSaved shape as expected by view
    properties.value = data.map((p: any) => ({
      ...p,
      isSaved: Boolean(p.isSaved),
      agent: p.agent || p.user
    }))
    
    console.log('📍 Residential properties with coordinates:', properties.value.filter(p => p.latitude && p.longitude).length)
  } catch (error) {
    console.error('❌ Search error:', error)
    // Fallback to regular search on error
    try {
      let data = await propertyService.search(searchParams)
      // Apply residential filter to fallback data as well
      data = filterResidentialProperties(data)
      
      properties.value = data.map((p: any) => ({
        ...p,
        isSaved: Boolean(p.isSaved),
        agent: p.agent || p.user
      }))
      totalProperties.value = data.length
    } catch (fallbackError) {
      console.error('❌ Fallback search also failed:', fallbackError)
    }
  } finally {
    if (showLoadingState) {
      loading.value = false
    }
    initialLoading.value = false
  }
}

const updateFilters = (newFilters: PropertyFilter) => {
  filters.value = newFilters
  currentPage.value = 1 // Reset to first page when filters change
  handleSearch(newFilters)
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const handleBoundsUpdate = (bounds: MapBounds) => {
  // Clear previous timeout
  if (boundsUpdateTimeout) {
    clearTimeout(boundsUpdateTimeout)
  }
  
  // Debounce bounds updates to avoid excessive API calls
  // Don't show loading state for map interactions
  boundsUpdateTimeout = setTimeout(() => {
    handleSearch({ ...filters.value, bounds }, false)
  }, 500) // Wait 500ms after user stops interacting
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

// Handle city selection
const handleCitySelected = (city: City | null) => {
  if (city) {
    selectedCity.value = city.name
    filters.value.city = city.name
    filters.value.location = '' // Clear location when city is selected
    
    console.log(`🏙️ Selected city: ${city.name} (${city.count} properties)`)
    
    // Reset pagination
    currentPage.value = 1
    
    // Trigger search for selected city
    handleSearch(filters.value)
  }
}

const clearCitySelection = () => {
  selectedCity.value = ''
  filters.value.city = ''
  currentPage.value = 1
  handleSearch(filters.value)
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    scrollToTop()
  }
}

const scrollToTop = () => {
  const searchPanel = document.querySelector('.search-results')
  if (searchPanel) {
    searchPanel.scrollTop = 0
  }
}

// Track page views
onMounted(async () => {
  const analytics = useAnalytics()
  analytics.trackPageView({
    path: '/map-search',
    title: 'Property Search'
  })
  
  // Register service worker
  try {
    await registerServiceWorker()
    console.log('✅ Service worker ready')
  } catch (error) {
    console.warn('⚠️ Service worker failed to register:', error)
  }
  
  // Initial load - start without city filter to show some results immediately
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

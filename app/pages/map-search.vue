<template>
  <v-container fluid class="pa-0 map-search-wrapper">
    <v-row no-gutters class="layout-row">
      <!-- Search Panel: Sidebar -->
      <v-col 
        cols="12" 
        lg="4" 
        xl="3"
        class="search-panel-col"
        :class="{ 'panel-hidden': !showPanel }"
      >
        <div class="search-panel">
          <!-- Premium Header -->
          <div class="panel-header px-6 py-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <h1 class="premium-title">Properties</h1>
              <v-btn
                icon="mdi-close"
                variant="text"
                density="comfortable"
                @click="showPanel = false"
                class="d-lg-none"
              />
            </div>
            
            <!-- Location Selection Group -->
            <div class="location-group">
              <CitySelector
                v-model="selectedCity"
                @city-selected="handleCitySelected"
                class="premium-input mb-3"
              />
              
              <NeighborhoodDropdown
                v-model="selectedNeighborhoodId"
                label="Neighborhood"
                placeholder="All Areas"
                :city-filter="selectedCity"
                @neighborhood-selected="handleNeighborhoodSelected"
                class="premium-input"
              />

              <v-expand-transition>
                <v-alert 
                  v-if="selectedCity || selectedNeighborhoodId"
                  variant="tonal"
                  color="black"
                  density="compact"
                  class="mt-4 selection-alert"
                  rounded="lg"
                >
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-caption font-weight-bold">
                      {{ selectedNeighborhoodInfo?.name || selectedCity }}
                    </span>
                    <v-btn 
                      size="x-small" 
                      variant="plain" 
                      @click="clearLocationSelection"
                      class="text-decoration-underline"
                    >Reset</v-btn>
                  </div>
                </v-alert>
              </v-expand-transition>
            </div>
          </div>

          <v-divider />

          <!-- Main Scrollable Content Area -->
          <div class="panel-main-content">
            <!-- Filter Section -->
            <div class="filters-section px-6 py-6">
              <SearchFilters
                :initial-filters="filters"
                @search="handleSearch"
                @update:filters="updateFilters"
                variant="filled"
                density="comfortable"
                class="custom-filters"
              />
            </div>

            <v-divider class="mx-6" />

            <!-- Results List -->
            <div class="results-container px-6 py-6">
              <div class="d-flex align-center justify-space-between mb-6">
                <div>
                  <div class="text-h6 font-weight-bold leading-tight">
                    {{ initialLoading ? 'Searching...' : `${totalProperties} Found` }}
                  </div>
                  <div class="text-caption text-medium-emphasis tracking-wide" v-if="!initialLoading">
                    Showing results in {{ selectedCity || 'All Areas' }}
                  </div>
                </div>
                <v-select
                  v-model="sortBy"
                  :items="sortOptions"
                  variant="plain"
                  density="compact"
                  hide-details
                  class="sort-minimal"
                  @update:model-value="handleSortChange"
                />
              </div>

              <!-- Property List -->
              <div class="property-list-container">
                <v-row v-if="initialLoading || loading" no-gutters>
                  <v-col v-for="n in 3" :key="n" cols="12" class="mb-6">
                    <v-skeleton-loader type="image, article" class="rounded-xl" />
                  </v-col>
                </v-row>
                
                <template v-else-if="properties.length > 0">
                  <div v-for="property in paginatedProperties" :key="property.id" class="mb-6">
                    <PropertyCard
                      :property="property"
                      class="premium-card"
                      @click="selectProperty(property)"
                      @save="toggleSave(property)"
                      @contact="contactAgent(property)"
                    />
                  </div>
                </template>

                <!-- Premium Pagination -->
                <div v-if="totalPagesComputed > 1 && !loading" class="pagination-footer pt-4 pb-12">
                  <div class="d-flex align-center justify-center gap-4">
                    <v-btn
                      :disabled="currentPage === 1"
                      variant="outlined"
                      icon="mdi-arrow-left"
                      size="small"
                      @click="goToPage(currentPage - 1)"
                    />
                    <div class="page-indicator">
                      <span class="current">{{ currentPage }}</span>
                      <span class="separator">/</span>
                      <span class="total">{{ totalPagesComputed }}</span>
                    </div>
                    <v-btn
                      :disabled="currentPage === totalPagesComputed"
                      variant="outlined"
                      icon="mdi-arrow-right"
                      size="small"
                      @click="goToPage(currentPage + 1)"
                    />
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="!loading && properties.length === 0" class="text-center py-16">
                  <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-map-marker-off-outline</v-icon>
                  <div class="text-h6 font-weight-bold">No results found</div>
                  <div class="text-body-2 text-medium-emphasis mb-6">Try adjusting your filters or area</div>
                  <v-btn variant="outlined" rounded="pill" @click="clearCitySelection">Clear All</v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Map Section -->
      <v-col class="map-container-col">
        <!-- Floating Mobile Toggle -->
        <v-btn
          v-if="!showPanel"
          class="mobile-panel-toggle d-lg-none"
          color="black"
          icon="mdi-filter-variant"
          elevation="8"
          @click="showPanel = true"
        />

        <div class="map-wrapper">
          <PropertyMap
            :properties="properties"
            :selected-property="selectedProperty"
            :latitude="mapCenter.latitude"
            :longitude="mapCenter.longitude"
            @bounds-updated="handleBoundsUpdate"
            @marker-click="selectProperty"
          />

          <!-- Floating Selected Detail -->
          <v-slide-y-reverse-transition>
            <div v-if="selectedProperty" class="floating-property-detail shadow-2xl">
              <div class="relative">
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="flat"
                  color="white"
                  class="close-floating-btn"
                  @click="selectedProperty = null"
                />
                <PropertyCard
                  :property="selectedProperty"
                  show-contact-button
                  compact
                  @save="toggleSave(selectedProperty)"
                  @contact="contactAgent(selectedProperty)"
                />
              </div>
            </div>
          </v-slide-y-reverse-transition>
        </div>
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <v-dialog v-model="showContactDialog" max-width="550" persistent scrollable transition="dialog-bottom-transition">
      <InquiryForm
        v-if="contactProperty"
        :property-id="contactProperty.id"
        :agent="contactProperty.agent"
        class="rounded-xl"
        @submit="handleInquiry"
        @schedule="handleSchedule"
        @close="showContactDialog = false"
      />
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Property as BaseProperty, PropertyFilter, User } from '~/types'
import { useAnalytics } from '../../utils/analytics'
import { propertyService } from '~/services/property.service'
import { usePropertyService } from '~/composables/usePropertyService'
import { filterResidentialProperties } from '../../utils/propertyFilters'

// Interfaces
interface Property extends BaseProperty {
  isSaved: boolean;
  agent: User;
}

interface City {
  name: string
  count: number
  province: string
  coordinates?: { latitude: number; longitude: number }
  stats: { avgPrice: number; minPrice: number; maxPrice: number; avgSqft: number }
}

// State
const loading = ref(false)
const initialLoading = ref(true)
const showPanel = ref(true)
const selectedProperty = ref<Property | null>(null)
const showContactDialog = ref(false)
const contactProperty = ref<Property | null>(null)
const currentPage = ref(1)
const itemsPerPage = 100
const selectedCity = ref('')
const selectedCityCoordinates = ref<{ latitude: number; longitude: number } | null>(null)
const selectedNeighborhoodId = ref<number | null>(null)
const selectedNeighborhoodInfo = ref<any>(null)
const totalProperties = ref(0)
const totalPages = ref(0)
let boundsUpdateTimeout: NodeJS.Timeout | null = null

const { registerServiceWorker } = usePropertyService()

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
  { title: 'Newest', value: 'newest' },
  { title: 'Price: Low', value: 'price_asc' },
  { title: 'Price: High', value: 'price_desc' },
  { title: 'Popular', value: 'popular' }
]

const properties = ref<Property[]>([])

const getSortOrder = (sortValue: string) => {
  switch (sortValue) {
    case 'price_asc': return { field: 'price', direction: 'asc' }
    case 'price_desc': return { field: 'price', direction: 'desc' }
    case 'popular': return { field: 'views', direction: 'desc' }
    default: return { field: 'createdAt', direction: 'desc' }
  }
}

const totalPagesComputed = computed(() => totalPages.value || Math.ceil(totalProperties.value / itemsPerPage))
const paginatedProperties = computed(() => properties.value)

// Compute map center based on selected city/neighborhood or default to Edmonton
const mapCenter = computed(() => {
  // Priority 1: Selected neighborhood coordinates
  if (selectedNeighborhoodInfo.value?.coordinates) {
    return {
      latitude: selectedNeighborhoodInfo.value.coordinates.latitude,
      longitude: selectedNeighborhoodInfo.value.coordinates.longitude
    }
  }
  // Priority 2: Selected city coordinates
  if (selectedCityCoordinates.value) {
    return {
      latitude: selectedCityCoordinates.value.latitude,
      longitude: selectedCityCoordinates.value.longitude
    }
  }
  // Priority 3: First property's coordinates
  const first = properties.value[0]
  if (first?.latitude && first?.longitude) {
    return { latitude: first.latitude, longitude: first.longitude }
  }
  // Default: Edmonton, Alberta
  return { latitude: 53.5461, longitude: -113.4938 }
})

const handleSearch = async (searchParams: PropertyFilter, showLoadingState: boolean = true, page?: number) => {
  const targetPage = page !== undefined ? page : currentPage.value
  if (showLoadingState) loading.value = true
  
  try {
    const paginatedSearchParams = {
      ...searchParams,
      limit: itemsPerPage,
      offset: (targetPage - 1) * itemsPerPage,
      sortBy: sortBy.value,
      sortOrder: getSortOrder(sortBy.value)
    }
    
    const response = await propertyService.searchWithPagination(paginatedSearchParams)
    let data = filterResidentialProperties(response.properties || [])
    
    totalProperties.value = response.pagination?.total || data.length
    totalPages.value = Math.ceil(totalProperties.value / itemsPerPage)
    
    properties.value = data.map((p: any) => ({
      ...p,
      isSaved: Boolean(p.isSaved),
      agent: p.agent || p.user
    }))
  } catch (error) {
    console.error('Search error:', error)
  } finally {
    loading.value = false
    initialLoading.value = false
  }
}

const updateFilters = (newFilters: PropertyFilter) => {
  filters.value = { ...filters.value, ...newFilters }
  currentPage.value = 1
  handleSearch(filters.value)
}

const handleSortChange = () => {
  currentPage.value = 1
  handleSearch(filters.value, true, 1)
}

const handleBoundsUpdate = (bounds: any) => {
  if (boundsUpdateTimeout) clearTimeout(boundsUpdateTimeout)
  boundsUpdateTimeout = setTimeout(() => {
    handleSearch({ ...filters.value, bounds }, false)
  }, 600)
}

const selectProperty = (property: Property) => {
  selectedProperty.value = property
}

const toggleSave = async (property: Property) => {
  property.isSaved = !property.isSaved
}

const contactAgent = (property: Property) => {
  contactProperty.value = property
  showContactDialog.value = true
}

const handleInquiry = async () => { showContactDialog.value = false }
const handleSchedule = async () => { showContactDialog.value = false }

const handleCitySelected = (city: City | null) => {
  if (city) {
    selectedCity.value = city.name
    selectedCityCoordinates.value = city.coordinates || null
    filters.value.city = city.name
    currentPage.value = 1
    handleSearch(filters.value)
  } else {
    selectedCity.value = ''
    selectedCityCoordinates.value = null
    filters.value.city = ''
  }
}

const handleNeighborhoodSelected = (neighborhood: any) => {
  selectedNeighborhoodInfo.value = neighborhood
  if (neighborhood) {
    selectedCity.value = ''
    filters.value.city = ''
    filters.value.neighborhoodId = neighborhood.id
  }
  currentPage.value = 1
  handleSearch(filters.value)
}

const clearLocationSelection = () => {
  selectedCity.value = ''
  selectedCityCoordinates.value = null
  selectedNeighborhoodId.value = null
  selectedNeighborhoodInfo.value = null
  filters.value.city = ''
  filters.value.neighborhoodId = null
  currentPage.value = 1
  handleSearch(filters.value)
}

const clearCitySelection = () => {
  selectedCity.value = ''
  selectedCityCoordinates.value = null
  filters.value.city = ''
  currentPage.value = 1
  handleSearch(filters.value)
}

const goToPage = async (page: number) => {
  if (page >= 1 && page <= totalPagesComputed.value) {
    currentPage.value = page
    scrollToResultsTop()
    await handleSearch(filters.value, true, page)
  }
}

const scrollToResultsTop = () => {
  document.querySelector('.panel-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  useAnalytics().trackPageView({ path: '/map-search', title: 'Property Search' })
  try { await registerServiceWorker() } catch (e) {}
  await handleSearch(filters.value)
})
</script>

<style scoped>
.map-search-wrapper {
  height: calc(100vh - 64px);
  background-color: #fff;
  overflow: hidden;
}

.layout-row {
  height: 100%;
  flex-wrap: nowrap;
}

/* Sidebar Structure */
.search-panel-col {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #f0f0f0;
}

/* Scrollable Container for Filters + List */
.panel-main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.panel-main-content::-webkit-scrollbar {
  width: 5px;
}
.panel-main-content::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 10px;
}

.premium-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
  background-color: #f9f9f9 !important;
}

/* Spacing and Visibility Fixes */
.filters-section {
  flex-shrink: 0;
}

.results-container {
  flex: 1;
}

.property-list-container {
  min-height: 400px;
}

/* Pagination Styles */
.page-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.9rem;
}
.page-indicator .separator {
  color: #ccc;
  font-weight: 400;
}
.page-indicator .total {
  color: #999;
}

/* Map Section Fixes */
.map-container-col {
  position: relative;
  height: 100%;
  flex-grow: 1;
  min-width: 0; /* Prevents overflow-x issues in flex */
}

.map-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8f8f8;
}

.mobile-panel-toggle {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.floating-property-detail {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 420px;
  z-index: 100;
}

.close-floating-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 110;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Utility */
.leading-tight { line-height: 1.2; }
.tracking-wide { letter-spacing: 0.05em; }
.shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }

@media (max-width: 1263px) {
  .layout-row {
    flex-wrap: wrap;
  }
  
  .search-panel-col {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100% !important;
    max-width: 400px;
    box-shadow: 20px 0 50px rgba(0,0,0,0.1);
  }
  
  .panel-hidden {
    transform: translateX(-110%);
  }
  
  .map-container-col {
    width: 100%;
    flex: 1 1 100%;
  }

  .floating-property-detail {
    bottom: 20px;
  }
}

@media (max-width: 600px) {
  .search-panel-col {
    max-width: 100%;
  }
}
</style>
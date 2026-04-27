<template>
  <v-container fluid class="pa-0 map-search-wrapper">
    <v-row no-gutters class="layout-row">
      <!-- Search Panel: Sidebar -->
      <v-col 
        cols="12" 
        class="search-panel-col"
        :class="{ 'panel-hidden': !showPanel, 'is-resizing': isResizing }"
        :style="{ '--sidebar-width': sidebarWidth + 'px' }"
      >
        <div class="search-panel">
          <!-- Resize Handle (drag to resize, double-click to reset) -->
          <div
            class="resize-handle d-none d-lg-flex"
            @mousedown="startResize"
            @dblclick="resetSidebarWidth"
            :title="`Drag to resize · double-click to reset (${sidebarWidth}px)`"
          >
            <span class="resize-grip"></span>
          </div>
          <!-- Premium Dark Header -->
          <div class="panel-header">
            <div class="panel-header-top">
              <div class="d-flex align-center gap-3">
                <div class="header-icon-badge">
                  <v-icon size="20" color="white">mdi-home-search</v-icon>
                </div>
                <div>
                  <h1 class="premium-title">Properties</h1>
                  <p class="premium-subtitle">Search &amp; explore listings</p>
                </div>
              </div>
              <v-btn
                icon="mdi-chevron-double-left"
                variant="text"
                density="comfortable"
                color="white"
                @click="showPanel = false"
                class="close-panel-btn"
                title="Hide panel"
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
                v-model="selectedNeighborhoodName"
                label="Neighborhood"
                placeholder="All Areas"
                :city-filter="selectedCity"
                @neighborhood-selected="handleNeighborhoodSelected"
                class="premium-input"
              />

              <v-expand-transition>
                <div v-if="selectedCity || selectedNeighborhoodName" class="selection-badge">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center gap-2">
                      <span class="selection-dot"></span>
                      <span class="selection-label">
                        {{ selectedNeighborhoodInfo?.name || selectedCity }}
                      </span>
                    </div>
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="white"
                      class="selection-reset"
                      @click="clearLocationSelection"
                    >Reset</v-btn>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </div>

          <!-- Main Scrollable Content Area -->
          <div class="panel-main-content">
            <!-- Filter Section -->
            <div class="filters-section">
              <div class="filters-label">
                <v-icon size="14" class="mr-1">mdi-tune-variant</v-icon>
                Filters
              </div>
              <SearchFilters
                :initial-filters="filters"
                @search="handleSearch"
                @update:filters="updateFilters"
                variant="filled"
                density="comfortable"
                class="custom-filters"
              />
            </div>

            <div class="section-divider"></div>

            <!-- Results List -->
            <div class="results-container">
              <div class="results-header">
                <div>
                  <div class="results-count">
                    <template v-if="initialLoading">
                      <span class="count-shimmer"></span>
                      Searching&hellip;
                    </template>
                    <template v-else>
                      <span class="count-number">{{ totalProperties }}</span>
                      Found
                    </template>
                  </div>
                  <div class="results-area" v-if="!initialLoading">
                    in {{ selectedCity || 'All Areas' }}
                  </div>
                </div>
                <v-select
                  v-model="sortBy"
                  :items="sortOptions"
                  variant="plain"
                  density="compact"
                  hide-details
                  class="sort-select"
                  @update:model-value="handleSortChange"
                />
              </div>

              <!-- Property List -->
              <div class="property-list-container">
                <v-row v-if="initialLoading || loading" no-gutters>
                  <v-col v-for="n in 3" :key="n" cols="12" class="mb-5">
                    <v-skeleton-loader type="image, article" class="skeleton-premium" />
                  </v-col>
                </v-row>

                <template v-else-if="properties.length > 0">
                  <div v-for="property in paginatedProperties" :key="property.id" class="property-item">
                    <PropertyCard
                      :property="property"
                      class="premium-card"
                      @click="selectProperty(property)"
                      @save="toggleSave(property)"
                      @contact="contactAgent(property)"
                    />
                  </div>
                </template>

                <!-- Pagination -->
                <div v-if="totalPagesComputed > 1 && !loading" class="pagination-footer">
                  <div class="pagination-inner">
                    <v-btn
                      :disabled="currentPage === 1"
                      variant="flat"
                      icon="mdi-chevron-left"
                      size="small"
                      class="page-btn"
                      @click="goToPage(currentPage - 1)"
                    />
                    <div class="page-indicator">
                      <span class="page-current">{{ currentPage }}</span>
                      <span class="page-sep">/</span>
                      <span class="page-total">{{ totalPagesComputed }}</span>
                    </div>
                    <v-btn
                      :disabled="currentPage === totalPagesComputed"
                      variant="flat"
                      icon="mdi-chevron-right"
                      size="small"
                      class="page-btn"
                      @click="goToPage(currentPage + 1)"
                    />
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="!loading && properties.length === 0" class="empty-state">
                  <div class="empty-icon-wrap">
                    <v-icon size="32" color="#94a3b8">mdi-map-marker-off-outline</v-icon>
                  </div>
                  <div class="empty-title">No results found</div>
                  <div class="empty-desc">Try adjusting your filters or area</div>
                  <v-btn
                    variant="outlined"
                    rounded="pill"
                    size="small"
                    class="empty-btn"
                    @click="clearCitySelection"
                  >Clear All</v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Map Section -->
      <v-col class="map-container-col">
        <!-- Floating Toggle (mobile + desktop when panel is collapsed) -->
        <v-btn
          v-if="!showPanel"
          class="panel-toggle-btn"
          icon="mdi-filter-variant"
          elevation="0"
          @click="showPanel = true"
          title="Show filters"
        />

        <div class="map-wrapper" @click="handleMapClick">
          <PropertyMap
            :properties="properties"
            :selected-property="selectedProperty"
            :latitude="mapCenter.latitude"
            :longitude="mapCenter.longitude"
            :show-popup="false"
            @bounds-updated="handleBoundsUpdate"
            @marker-click="selectProperty"
          />

          <!-- Floating Selected Detail -->
          <v-slide-y-reverse-transition>
            <div v-if="selectedProperty" class="floating-property-detail">
              <div class="floating-inner">
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="flat"
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

    <v-snackbar v-model="searchError" color="error" :timeout="5000" location="top">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ searchErrorMessage }}
      <template #actions>
        <v-btn variant="text" @click="searchError = false">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { Property as BaseProperty, PropertyFilter, User } from '~/types'
import { useAnalytics } from '../../utils/analytics'
import { propertyService } from '~/services/property.service'
import { usePropertyService } from '~/composables/usePropertyService'

useSeoMeta({
  title: 'Map Search - Browse Properties on a Map',
  description: 'Search for homes for sale on an interactive map. Explore Calgary, Edmonton and surrounding Alberta neighborhoods visually.',
  ogTitle: 'Map Search - Browse Properties on a Map',
  ogDescription: 'Search for homes for sale on an interactive map. Explore Calgary, Edmonton and surrounding Alberta neighborhoods visually.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Map Search - Browse Properties on a Map',
  twitterDescription: 'Explore Alberta homes for sale on an interactive map.',
  robots: 'index, follow',
})
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
const searchError = ref(false)
const searchErrorMessage = ref('')
const showPanel = ref(true)

// Sidebar resize / dock state (desktop only)
const SIDEBAR_DEFAULT_WIDTH = 380
const SIDEBAR_MIN_WIDTH = 300
const SIDEBAR_MAX_WIDTH = 640
const SIDEBAR_STORAGE_KEY = 'mapSearch.sidebarWidth'
const sidebarWidth = ref(SIDEBAR_DEFAULT_WIDTH)
const isResizing = ref(false)

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', stopResize)
}

const onResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return
  const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, e.clientX))
  sidebarWidth.value = next
}

const stopResize = () => {
  if (!isResizing.value) return
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', stopResize)
  try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth.value)) } catch {}
  // Let leaflet recompute container size after width change
  window.dispatchEvent(new Event('resize'))
}

const resetSidebarWidth = () => {
  sidebarWidth.value = SIDEBAR_DEFAULT_WIDTH
  try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(SIDEBAR_DEFAULT_WIDTH)) } catch {}
  window.dispatchEvent(new Event('resize'))
}

// Click on the map background hides the sidebar for full-width view.
// Marker clicks bubble up too — that's intentional: selecting a property collapses the
// sidebar so the floating property card has the full map as backdrop.
const handleMapClick = (e: MouseEvent) => {
  // Ignore clicks on leaflet UI controls (zoom, attribution, etc.)
  const target = e.target as HTMLElement | null
  if (target?.closest('.leaflet-control')) return
  if (showPanel.value) showPanel.value = false
}
const selectedProperty = ref<Property | null>(null)
const showContactDialog = ref(false)
const contactProperty = ref<Property | null>(null)
const currentPage = ref(1)
const itemsPerPage = 100
const selectedCity = ref('')
const selectedCityCoordinates = ref<{ latitude: number; longitude: number } | null>(null)
const selectedNeighborhoodName = ref<string | null>(null)
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
  if (selectedNeighborhoodInfo.value?.centerLatitude && selectedNeighborhoodInfo.value?.centerLongitude) {
    return {
      latitude: selectedNeighborhoodInfo.value.centerLatitude,
      longitude: selectedNeighborhoodInfo.value.centerLongitude
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
  } catch (error: any) {
    console.error('Search error:', error)
    searchErrorMessage.value =
      error?.data?.statusMessage ||
      error?.statusMessage ||
      error?.message ||
      'We could not load search results. Please try again.'
    searchError.value = true
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
    // Keep the city filter active — subdivision is WITHIN the selected city
    ;(filters.value as any).subdivision = neighborhood.name
    delete (filters.value as any).neighborhoodId

    // Center map on neighborhood if coordinates available
    if (neighborhood.centerLatitude && neighborhood.centerLongitude) {
      selectedCityCoordinates.value = {
        latitude: neighborhood.centerLatitude,
        longitude: neighborhood.centerLongitude
      }
    }
  } else {
    delete (filters.value as any).subdivision
  }
  currentPage.value = 1
  handleSearch(filters.value)
}

const clearLocationSelection = () => {
  selectedCity.value = ''
  selectedCityCoordinates.value = null
  selectedNeighborhoodName.value = null
  selectedNeighborhoodInfo.value = null
  filters.value.city = ''
  delete (filters.value as any).subdivision
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
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (saved) {
      const n = parseInt(saved, 10)
      if (Number.isFinite(n)) sidebarWidth.value = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, n))
    }
  } catch {}
  await handleSearch(filters.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
.map-search-wrapper {
  height: calc(100vh - 64px);
  background-color: #f8fafc;
  overflow: hidden;
}
.layout-row {
  height: 100%;
  flex-wrap: nowrap;
}

/* ═══════════════════════════════════════════
   SIDEBAR PANEL
   ═══════════════════════════════════════════ */
.search-panel-col {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}
/* Desktop: width comes from --sidebar-width (drag-resizable) */
@media (min-width: 1264px) {
  .search-panel-col {
    flex: 0 0 var(--sidebar-width, 380px) !important;
    max-width: var(--sidebar-width, 380px) !important;
    width: var(--sidebar-width, 380px) !important;
  }
  /* While dragging, disable transitions for snappy feel */
  .search-panel-col.is-resizing { transition: none !important; }
}
.search-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e2e8f0;
}

/* ── Resize Handle ── */
.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 50;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.15s;
}
.resize-handle:hover,
.search-panel-col.is-resizing .resize-handle {
  background: rgba(59, 130, 246, 0.08);
}
.resize-grip {
  width: 2px;
  height: 36px;
  border-radius: 2px;
  background: #cbd5e1;
  transition: background 0.15s, height 0.15s;
}
.resize-handle:hover .resize-grip,
.search-panel-col.is-resizing .resize-grip {
  background: #3b82f6;
  height: 56px;
}

/* ── Dark Header ── */
.panel-header {
  background: linear-gradient(145deg, #0f172a, #1e293b);
  padding: 18px 20px 16px;
  flex-shrink: 0;
}
.panel-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.header-icon-badge {
  width: 40px; height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(59,130,246,0.3);
  flex-shrink: 0;
}
.premium-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  line-height: 1.2;
}
.premium-subtitle {
  font-size: 0.72rem;
  color: #64748b;
  margin: 1px 0 0;
  letter-spacing: 0.02em;
}
.close-panel-btn { opacity: 0.6; }
.close-panel-btn:hover { opacity: 1; }

/* ── Location Inputs ── */
.location-group {
  display: flex;
  flex-direction: column;
}
.premium-input :deep(.v-field) {
  border-radius: 9px !important;
  background: rgba(255,255,255,0.06) !important;
  border: 1px solid rgba(255,255,255,0.09) !important;
  backdrop-filter: blur(4px);
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  min-height: 40px !important;
}
.premium-input :deep(.v-field__input) {
  min-height: 40px !important;
  padding-top: 10px !important;
  padding-bottom: 6px !important;
  font-size: 0.85rem !important;
}
.premium-input :deep(.v-field__field) { min-height: 40px !important; }
.premium-input :deep(.v-label) { font-size: 0.78rem !important; }
.premium-input :deep(.v-field:hover) {
  background: rgba(255,255,255,0.09) !important;
  border-color: rgba(255,255,255,0.16) !important;
}
.premium-input :deep(.v-field--focused) {
  background: rgba(255,255,255,0.11) !important;
  border-color: rgba(59,130,246,0.5) !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
.premium-input :deep(.v-field__input),
.premium-input :deep(.v-label),
.premium-input :deep(.v-field__append-inner .v-icon),
.premium-input :deep(.v-field__prepend-inner .v-icon) {
  color: rgba(255,255,255,0.8) !important;
}

/* ── Selection Badge ── */
.selection-badge {
  margin-top: 12px;
  background: rgba(59,130,246,0.15);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 10px;
  padding: 10px 14px;
  backdrop-filter: blur(4px);
}
.selection-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59,130,246,0.5);
  flex-shrink: 0;
}
.selection-label {
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
}
.selection-reset {
  font-size: 0.68rem !important;
  text-decoration: underline;
  opacity: 0.7;
}
.selection-reset:hover { opacity: 1; }

/* ═══════════════════════════════════════════
   SCROLLABLE CONTENT
   ═══════════════════════════════════════════ */
.panel-main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.panel-main-content::-webkit-scrollbar { width: 4px; }
.panel-main-content::-webkit-scrollbar-track { background: transparent; }
.panel-main-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.panel-main-content::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* ── Filters ── */
.filters-section {
  flex-shrink: 0;
  padding: 14px 20px 8px;
}
.filters-label {
  display: flex;
  align-items: center;
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-bottom: 10px;
}

/* Slim, clean filter fields */
.custom-filters :deep(.v-card) {
  box-shadow: none !important;
  background: transparent !important;
}
.custom-filters :deep(.v-card-text) {
  padding: 0 !important;
}
.custom-filters :deep(.v-row) {
  margin: 0 -4px !important;
}
.custom-filters :deep(.v-col) {
  padding: 4px !important;
}
.custom-filters :deep(.v-field) {
  border-radius: 9px !important;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  min-height: 38px !important;
}
.custom-filters :deep(.v-field__field),
.custom-filters :deep(.v-field__input) {
  min-height: 38px !important;
}
.custom-filters :deep(.v-field__input) {
  padding-top: 8px !important;
  padding-bottom: 4px !important;
  font-size: 0.82rem !important;
}
.custom-filters :deep(.v-field__outline) { display: none !important; }
.custom-filters :deep(.v-label) {
  font-size: 0.74rem !important;
  opacity: 0.75;
}
.custom-filters :deep(.v-field__prepend-inner .v-icon) {
  font-size: 16px !important;
  opacity: 0.55;
  margin-inline-end: 4px !important;
}
.custom-filters :deep(.v-field:hover) {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}
.custom-filters :deep(.v-field--focused) {
  background: #fff !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.custom-filters :deep(.v-checkbox) {
  margin-top: 0 !important;
}
.custom-filters :deep(.v-checkbox .v-label) {
  font-size: 0.82rem !important;
  opacity: 0.85;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
  margin: 0 24px;
}

/* ═══════════════════════════════════════════
   RESULTS
   ═══════════════════════════════════════════ */
.results-container {
  flex: 1;
  padding: 20px 24px;
}
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.results-count {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.count-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #fff;
  border-radius: 7px;
  padding: 2px 10px;
  font-size: 0.85rem;
  font-weight: 800;
  min-width: 32px;
}
.count-shimmer {
  width: 36px; height: 22px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  display: inline-block;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.results-area {
  font-size: 0.7rem;
  color: #94a3b8;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.sort-select { max-width: 130px; flex-shrink: 0; }
.sort-select :deep(.v-field__input) { font-size: 0.78rem; color: #64748b; }

/* ── Property Items ── */
.property-list-container { min-height: 400px; }
.property-item {
  margin-bottom: 16px;
  transition: transform 0.15s;
}
.property-item:hover { transform: translateY(-1px); }
.premium-card {
  border-radius: 14px !important;
  overflow: hidden;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03) !important;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.premium-card:hover {
  border-color: #cbd5e1 !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04) !important;
}

.skeleton-premium {
  border-radius: 14px !important;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* ── Pagination ── */
.pagination-footer {
  padding: 20px 0 40px;
}
.pagination-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.page-btn {
  width: 36px !important; height: 36px !important;
  border-radius: 10px !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) {
  background: #0f172a !important;
  color: #fff !important;
}
.page-btn:disabled { opacity: 0.3; }
.page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  padding: 6px 16px;
  border-radius: 10px;
}
.page-current { font-weight: 800; color: #0f172a; font-size: 0.88rem; }
.page-sep { color: #cbd5e1; font-weight: 400; }
.page-total { color: #94a3b8; font-weight: 600; font-size: 0.85rem; }

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon-wrap {
  width: 64px; height: 64px;
  border-radius: 16px;
  background: #f1f5f9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-title {
  font-size: 1rem;
  font-weight: 800;
  color: #334155;
  margin-bottom: 4px;
}
.empty-desc {
  font-size: 0.82rem;
  color: #94a3b8;
  margin-bottom: 20px;
}
.empty-btn {
  border-color: #cbd5e1 !important;
  color: #475569 !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

/* ═══════════════════════════════════════════
   MAP SECTION
   ═══════════════════════════════════════════ */
.map-container-col {
  position: relative;
  height: 100%;
  flex-grow: 1;
  min-width: 0;
}
.map-wrapper {
  position: absolute;
  inset: 0;
  background: #eef2f7;
}

/* ── Floating Panel Toggle (mobile + desktop) ── */
.panel-toggle-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
  width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  background: #0f172a !important;
  color: #fff !important;
  box-shadow: 0 4px 20px rgba(15,23,42,0.3) !important;
  transition: transform 0.2s, background 0.2s;
}
.panel-toggle-btn:hover {
  transform: scale(1.05);
  background: #1e293b !important;
}

/* ── Floating Card ── */
.floating-property-detail {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 420px;
  z-index: 100;
}
.floating-inner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(226,232,240,0.8);
  box-shadow:
    0 4px 6px rgba(0,0,0,0.04),
    0 12px 32px rgba(0,0,0,0.1),
    0 24px 60px rgba(0,0,0,0.06);
}
.close-floating-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 110;
  width: 28px !important;
  height: 28px !important;
  border-radius: 8px !important;
  background: rgba(15,23,42,0.7) !important;
  color: #fff !important;
  backdrop-filter: blur(8px);
}
.close-floating-btn:hover {
  background: #0f172a !important;
}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
/* Desktop: collapsed = slide off-screen */
@media (min-width: 1264px) {
  .search-panel-col.panel-hidden {
    flex: 0 0 0 !important;
    max-width: 0 !important;
    width: 0 !important;
    overflow: hidden;
  }
}
@media (max-width: 1263px) {
  .layout-row { flex-wrap: wrap; }
  .search-panel-col {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: 100% !important;
    max-width: 400px;
    box-shadow: 12px 0 40px rgba(0,0,0,0.15);
  }
  .panel-hidden { transform: translateX(-110%); }
  .map-container-col { width: 100%; flex: 1 1 100%; }
  .floating-property-detail { bottom: 20px; }
  .resize-handle { display: none !important; }
}
@media (max-width: 600px) {
  .search-panel-col { max-width: 100%; }
  .panel-header { padding: 16px 16px 14px; }
  .filters-section { padding: 12px 16px 6px; }
  .results-container { padding: 14px 16px; }
}
</style>

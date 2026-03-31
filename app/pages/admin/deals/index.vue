<template>
  <FeatureGate :feature="FEATURES.BEST_DEALS" :show-upgrade-prompt="true">
    <div class="admin-deals px-md-8 py-md-6">
      <v-container fluid>
        <!-- Header -->
        <v-row class="mb-10 align-center">
          <v-col cols="12" md="8">
            <div class="d-flex align-center mb-2">
              <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
              <div class="premium-accent-bar mr-4"></div>
              <span class="text-overline letter-spacing-2 text-gold">Price Intelligence</span>
            </div>
            <h1 class="display-serif text-h3 mb-1">Best Deals of the Month</h1>
            <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
              Discover listings with recent price reductions in your market
            </p>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right">
            <v-btn color="primary" size="large" prepend-icon="mdi-content-save" class="premium-action-btn mr-2" @click="showSaveDialog = true" :disabled="!filters.city">
              Save Search
            </v-btn>
          </v-col>
        </v-row>

        <!-- Summary Cards -->
        <v-row class="mb-8">
          <v-col cols="12" sm="4">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h3 font-weight-bold text-error mb-1">{{ summary.totalDeals }}</div>
                <div class="text-overline text-medium-emphasis">Price Reductions</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h3 font-weight-bold text-warning mb-1">{{ summary.avgDropPercent }}%</div>
                <div class="text-overline text-medium-emphasis">Avg. Price Drop</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h3 font-weight-bold text-success mb-1">{{ summary.biggestDrop }}%</div>
                <div class="text-overline text-medium-emphasis">Biggest Drop</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-row class="mb-8">
          <v-col cols="12">
            <v-card class="filter-card" elevation="0">
              <v-card-text class="pa-6">
                <v-row align="center">
                  <v-col cols="12" sm="6" md="3">
                    <v-autocomplete
                      v-model="filters.city"
                      :items="filterOptions.cities"
                      label="City *"
                      variant="outlined"
                      density="compact"
                      clearable
                      prepend-inner-icon="mdi-city"
                      :rules="[v => !!v || 'City is required']"
                      placeholder="Select a city"
                      no-data-text="No cities found"
                      hide-details
                      @update:model-value="search"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="2">
                    <v-autocomplete
                      v-model="filters.community"
                      :items="filterOptions.communities"
                      label="Community / Region"
                      variant="outlined"
                      density="compact"
                      clearable
                      prepend-inner-icon="mdi-map-marker"
                      placeholder="Any"
                      no-data-text="No communities found"
                      hide-details
                      @update:model-value="search"
                    />
                  </v-col>
                  <v-col cols="auto" class="d-none d-sm-flex align-center px-0">
                    <v-chip size="x-small" variant="outlined" color="grey" class="font-weight-bold">OR</v-chip>
                  </v-col>
                  <v-col cols="12" sm="6" md="2">
                    <v-select
                      v-model="filters.propertyType"
                      :items="filterOptions.propertyTypes"
                      label="Property Type"
                      variant="outlined"
                      density="compact"
                      clearable
                      hide-details
                      @update:model-value="search"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="2">
                    <v-select
                      v-model="filters.minDrop"
                      :items="dropRanges"
                      item-title="label"
                      item-value="value"
                      label="Min Drop %"
                      variant="outlined"
                      density="compact"
                      clearable
                      hide-details
                      @update:model-value="search"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="2">
                    <v-select
                      v-model="filters.sortBy"
                      :items="sortOptions"
                      item-title="label"
                      item-value="value"
                      label="Sort By"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @update:model-value="search"
                    />
                  </v-col>
                </v-row>
                <div class="text-caption text-medium-emphasis mt-3">
                  <v-icon size="x-small" class="mr-1">mdi-information-outline</v-icon>
                  City is required. Community and Property Type filters are combined with <strong>OR</strong> logic.
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Price Margin Chart -->
        <v-row v-if="chartData.length > 0" class="mb-8">
          <v-col cols="12">
            <v-card class="chart-card" elevation="0">
              <v-card-text class="pa-6">
                <div class="d-flex align-center mb-4">
                  <v-icon class="mr-2" color="primary">mdi-chart-bar</v-icon>
                  <span class="text-h6 font-weight-bold">Price Margins – Top {{ chartData.length }} Deals</span>
                </div>
                <div class="chart-container">
                  <div
                    v-for="(item, index) in chartData"
                    :key="index"
                    class="chart-row mb-3"
                  >
                    <div class="chart-label text-body-2 text-truncate" :title="item.label">
                      {{ item.label }}
                    </div>
                    <div class="chart-bars">
                      <!-- Original price bar (full width = max original price) -->
                      <div class="bar-track">
                        <div
                          class="bar-original"
                          :style="{ width: barWidth(item.originalPrice) + '%' }"
                        >
                          <span class="bar-text">${{ formatPrice(item.originalPrice) }}</span>
                        </div>
                        <div
                          class="bar-current"
                          :style="{ width: barWidth(item.currentPrice) + '%' }"
                        >
                          <span class="bar-text">${{ formatPrice(item.currentPrice) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="chart-savings text-right">
                      <v-chip color="error" size="x-small" variant="flat" class="font-weight-bold">
                        -{{ item.dropPct.toFixed(1) }}%
                      </v-chip>
                    </div>
                  </div>
                </div>
                <div class="d-flex ga-4 mt-4">
                  <div class="d-flex align-center">
                    <div class="legend-dot legend-original mr-1"></div>
                    <span class="text-caption text-medium-emphasis">Original Price</span>
                  </div>
                  <div class="d-flex align-center">
                    <div class="legend-dot legend-current mr-1"></div>
                    <span class="text-caption text-medium-emphasis">Current Price</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Saved Searches -->
        <v-row v-if="savedSearches.length > 0" class="mb-6">
          <v-col cols="12">
            <div class="d-flex align-center flex-wrap ga-2">
              <span class="text-caption text-medium-emphasis mr-2">Saved:</span>
              <v-chip
                v-for="ss in savedSearches"
                :key="ss.id"
                variant="outlined"
                size="small"
                @click="applySavedSearch(ss)"
                class="mr-1"
              >
                {{ ss.name }}
              </v-chip>
            </div>
          </v-col>
        </v-row>

        <!-- City Required Prompt -->
        <v-row v-if="!filters.city && !loading" class="mb-8">
          <v-col cols="12">
            <v-card class="text-center pa-12" elevation="0" style="border: 2px dashed rgba(0,0,0,0.1); border-radius: 24px;">
              <v-icon size="80" color="primary" class="mb-4">mdi-city-variant-outline</v-icon>
              <div class="text-h5 font-weight-bold mb-2">Select a City to Get Started</div>
              <div class="text-body-1 text-medium-emphasis">
                Choose a city from the dropdown above to discover the best deals in that market
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Results -->
        <v-row v-if="filters.city">
          <v-col v-for="property in properties" :key="property.id" cols="12" sm="6" lg="4">
            <v-card class="deal-card" elevation="0">
              <!-- Property Image -->
              <div class="deal-image-wrapper">
                <v-img
                  :src="getPropertyImage(property)"
                  height="200"
                  cover
                  class="rounded-t-xl"
                >
                  <div class="deal-badge">
                    <v-chip color="error" size="small" class="font-weight-bold">
                      <v-icon start size="small">mdi-arrow-down-bold</v-icon>
                      {{ Math.abs(property.priceDrop?.changePct || 0).toFixed(1) }}% OFF
                    </v-chip>
                  </div>
                </v-img>
              </div>

              <v-card-text class="pa-5">
                <div class="text-h6 font-weight-bold mb-1 text-truncate">{{ property.address }}</div>
                <div class="text-body-2 text-medium-emphasis mb-3">{{ property.city }}, {{ property.province }}</div>

                <!-- Price Info -->
                <div class="d-flex align-center mb-3">
                  <div>
                    <div class="text-h5 font-weight-bold text-primary">${{ formatPrice(property.price) }}</div>
                    <div class="text-body-2 text-decoration-line-through text-medium-emphasis" v-if="property.priceDrop?.originalPrice">
                      ${{ formatPrice(property.priceDrop.originalPrice) }}
                    </div>
                  </div>
                  <v-spacer />
                  <div class="text-right">
                    <div class="text-body-2 font-weight-bold text-error">
                      -${{ formatPrice(property.priceDrop?.dollarSaved || 0) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDate(property.updatedAt) }}
                    </div>
                  </div>
                </div>

                <!-- Property Details -->
                <div class="d-flex ga-4 text-body-2 text-medium-emphasis mb-3">
                  <span><v-icon size="small" class="mr-1">mdi-bed</v-icon>{{ property.beds }} bd</span>
                  <span><v-icon size="small" class="mr-1">mdi-shower</v-icon>{{ property.baths }} ba</span>
                  <span><v-icon size="small" class="mr-1">mdi-ruler-square</v-icon>{{ property.sqft?.toLocaleString() }} sqft</span>
                </div>

                <!-- Price History -->
                <div v-if="property.priceHistory?.length > 1" class="price-history-mini">
                  <div class="text-caption font-weight-bold mb-1">Price History</div>
                  <div v-for="ph in property.priceHistory.slice(0, 3)" :key="ph.id" class="d-flex justify-space-between text-caption">
                    <span>{{ formatDate(ph.createdAt) }}</span>
                    <span :class="ph.event === 'price_decrease' ? 'text-error' : 'text-success'">
                      ${{ formatPrice(ph.price) }}
                    </span>
                  </div>
                </div>
              </v-card-text>

              <v-card-actions class="px-5 pb-5 pt-0">
                <v-btn variant="tonal" size="small" prepend-icon="mdi-email" @click="createCampaign(property)">
                  Campaign
                </v-btn>
                <v-btn variant="tonal" size="small" color="primary" prepend-icon="mdi-facebook" @click="postToFacebook(property)">
                  Share
                </v-btn>
                <v-spacer />
                <v-btn variant="text" size="small" :to="`/admin/properties/${property.id}`">
                  Details
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- Empty State (city selected but no results) -->
          <v-col v-if="properties.length === 0 && !loading && filters.city" cols="12">
            <v-card class="text-center pa-12" elevation="0" style="border: 2px dashed rgba(0,0,0,0.1); border-radius: 24px;">
              <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-tag-off</v-icon>
              <div class="text-h5 font-weight-bold mb-2">No price reductions found</div>
              <div class="text-body-1 text-medium-emphasis">
                No properties with price drops were found in <strong>{{ filters.city }}</strong>.
                <br />Try a different city or adjust your filters.
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Pagination -->
        <v-row v-if="pagination.pages > 1" class="mt-6">
          <v-col cols="12" class="d-flex justify-center">
            <v-pagination v-model="pagination.page" :length="pagination.pages" rounded @update:model-value="search" />
          </v-col>
        </v-row>

        <!-- Save Search Dialog -->
        <v-dialog v-model="showSaveDialog" max-width="400">
          <v-card class="rounded-xl">
            <v-card-title class="pa-6 display-serif text-h6">Save This Search</v-card-title>
            <v-card-text class="px-6">
              <v-text-field density="compact" v-model="searchName" label="Search Name" variant="outlined" placeholder="e.g., Calgary Price Drops" />
            </v-card-text>
            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="showSaveDialog = false">Cancel</v-btn>
              <v-btn color="primary" @click="saveSearch" :loading="savingSearch">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Loading -->
        <v-overlay :model-value="loading" class="align-center justify-center" contained>
          <v-progress-circular indeterminate size="64" color="primary" />
        </v-overlay>
      </v-container>
    </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const properties = ref<any[]>([])
const savedSearches = ref<any[]>([])
const chartData = ref<any[]>([])
const loading = ref(false)
const showSaveDialog = ref(false)
const savingSearch = ref(false)
const searchName = ref('')

const summary = ref({ totalDeals: 0, avgDropPercent: 0, biggestDrop: 0 })
const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })

const filterOptions = ref<{ cities: string[]; communities: string[]; propertyTypes: string[] }>({
  cities: [],
  communities: [],
  propertyTypes: [],
})

const filters = ref({
  city: '',
  community: '',
  propertyType: '',
  minDrop: null as number | null,
  sortBy: 'biggest_drop',
})

const dropRanges = [
  { label: '1%+', value: 1 },
  { label: '3%+', value: 3 },
  { label: '5%+', value: 5 },
  { label: '10%+', value: 10 },
  { label: '15%+', value: 15 },
]
const sortOptions = [
  { label: 'Biggest Drop %', value: 'biggest_drop' },
  { label: 'Most Recent', value: 'most_recent' },
  { label: 'Biggest Savings $', value: 'biggest_savings' },
]

// ───── Chart helpers ─────
const maxChartPrice = computed(() => {
  if (!chartData.value.length) return 1
  return Math.max(...chartData.value.map((d: any) => d.originalPrice))
})

function barWidth(price: number): number {
  return Math.max((price / maxChartPrice.value) * 100, 5)
}

// ───── Helpers ─────
function getPropertyImage(property: any) {
  const images = property.images
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === 'string' ? images[0] : images[0].url || images[0].Uri || '/placeholder.jpg'
  }
  return '/placeholder.jpg'
}

const formatPrice = (price: number) => Math.round(price).toLocaleString()
const formatDate = (date: string) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

// ───── Data fetching ─────
async function loadFilterOptions() {
  try {
    const res = await $fetch('/api/admin/price-cuts/filter-options', { headers: getAuthHeaders() }) as any
    filterOptions.value = {
      cities: res.cities || [],
      communities: res.communities || [],
      propertyTypes: res.propertyTypes || [],
    }
  } catch (e) {
    console.error('Error loading filter options:', e)
  }
}

async function search() {
  if (!filters.value.city) {
    // City is required – clear results
    properties.value = []
    chartData.value = []
    summary.value = { totalDeals: 0, avgDropPercent: 0, biggestDrop: 0 }
    return
  }

  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('city', filters.value.city)
    if (filters.value.community) params.set('community', filters.value.community)
    if (filters.value.propertyType) params.set('propertyType', filters.value.propertyType)
    if (filters.value.minDrop) params.set('minDrop', filters.value.minDrop.toString())
    params.set('sortBy', filters.value.sortBy)
    params.set('page', pagination.value.page.toString())

    const res = await $fetch(`/api/admin/price-cuts?${params}`, { headers: getAuthHeaders() }) as any
    properties.value = res.properties || []
    summary.value = res.summary || { totalDeals: 0, avgDropPercent: 0, biggestDrop: 0 }
    pagination.value = res.pagination || pagination.value
    chartData.value = res.chartData || []
  } catch (e: any) {
    console.error('Error searching price cuts:', e)
  } finally {
    loading.value = false
  }
}

async function loadSavedSearches() {
  try {
    const res = await $fetch('/api/admin/price-cuts/saved-searches', { headers: getAuthHeaders() }) as any
    savedSearches.value = res.searches || []
  } catch (e) {
    console.error('Error loading saved searches:', e)
  }
}

async function saveSearch() {
  if (!searchName.value) return
  savingSearch.value = true
  try {
    await $fetch('/api/admin/price-cuts/saved-searches', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { name: searchName.value, filters: filters.value },
    })
    showSaveDialog.value = false
    searchName.value = ''
    await loadSavedSearches()
  } finally {
    savingSearch.value = false
  }
}

function applySavedSearch(ss: any) {
  const f = ss.filters || {}
  filters.value = { ...filters.value, ...f }
  search()
}

function createCampaign(property: any) {
  navigateTo(`/admin/newsletter/campaigns/new?propertyId=${property.id}`)
}

function postToFacebook(property: any) {
  navigateTo(`/admin/facebook?propertyId=${property.id}`)
}

onMounted(() => {
  loadFilterOptions()
  loadSavedSearches()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-deals {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.filter-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.chart-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.chart-container {
  max-height: 400px;
  overflow-y: auto;
}

.chart-row {
  display: grid;
  grid-template-columns: 140px 1fr 70px;
  gap: 12px;
  align-items: center;
}

.chart-label {
  color: rgba(0,0,0,0.7);
  font-size: 0.8rem;
}

.bar-track {
  position: relative;
  height: 28px;
  background: #f5f5f5;
  border-radius: 6px;
  overflow: hidden;
}

.bar-original {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(239, 83, 80, 0.15);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  transition: width 0.5s ease;
}

.bar-current {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #1565C0, #42A5F5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  transition: width 0.5s ease;
}

.bar-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.bar-original .bar-text {
  color: rgba(0,0,0,0.5);
  text-shadow: none;
}

.chart-savings {
  min-width: 70px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-original {
  background: rgba(239, 83, 80, 0.15);
  border: 1px solid rgba(239, 83, 80, 0.4);
}

.legend-current {
  background: linear-gradient(90deg, #1565C0, #42A5F5);
}

.deal-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  overflow: hidden;
  transition: all 0.3s ease;
}
.deal-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important;
}

.deal-image-wrapper { position: relative; }
.deal-badge { position: absolute; top: 12px; left: 12px; z-index: 1; }

.price-history-mini {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 8px 12px;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}
</style>

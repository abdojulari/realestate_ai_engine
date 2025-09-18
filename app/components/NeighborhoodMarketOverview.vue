<template>
  <div class="neighborhood-market-overview">
    <v-card class="elevation-3">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-city</v-icon>
        <span class="text-h5">Market Overview by City</span>
        <v-spacer />
        <v-chip
          v-if="totalStats"
          color="primary"
          variant="outlined"
          size="small"
        >
          {{ totalStats.totalNeighborhoods }} Neighborhoods
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular
            indeterminate
            color="primary"
            size="50"
          />
          <p class="mt-3 text-body-2">Loading market overview...</p>
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <!-- Data Table -->
        <div v-else-if="cityStats.length > 0">
          <!-- Summary Stats -->
          <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-primary font-weight-bold">{{ totalStats.totalCities }}</div>
                <div class="text-caption text-medium-emphasis">Cities Covered</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-success font-weight-bold">{{ totalStats.totalNeighborhoods }}</div>
                <div class="text-caption text-medium-emphasis">Neighborhoods</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-info font-weight-bold">{{ formatNumber(totalStats.totalProperties) }}</div>
                <div class="text-caption text-medium-emphasis">Total Properties</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-warning font-weight-bold">{{ formatPrice(totalStats.avgPrice) }}</div>
                <div class="text-caption text-medium-emphasis">Avg Price</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Data Table -->
          <v-data-table
            :headers="headers"
            :items="cityStats"
            :items-per-page="20"
            class="elevation-1"
            item-value="city"
            :sort-by="[{ key: 'neighborhoodCount', order: 'desc' }]"
          >
            <template #item.city="{ item }">
              <div class="d-flex align-center">
                <v-icon class="mr-2" size="20" color="primary">mdi-map-marker</v-icon>
                <span class="font-weight-medium">{{ item.city }}</span>
              </div>
            </template>

            <template #item.neighborhoodCount="{ item }">
              <v-chip
                :color="getNeighborhoodCountColor(item.neighborhoodCount)"
                variant="flat"
                size="small"
              >
                {{ item.neighborhoodCount }}
              </v-chip>
            </template>

            <template #item.propertyRange="{ item }">
              <div class="text-body-2">
                <div class="font-weight-medium">{{ item.minProperties }} - {{ item.maxProperties }}</div>
                <div class="text-caption text-medium-emphasis">per neighborhood</div>
              </div>
            </template>

            <template #item.priceRange="{ item }">
              <div class="text-body-2">
                <div class="font-weight-medium text-success">{{ formatPrice(item.minPrice) }}</div>
                <div class="text-caption text-medium-emphasis">to</div>
                <div class="font-weight-medium text-warning">{{ formatPrice(item.maxPrice) }}</div>
              </div>
            </template>

            <template #item.totalProperties="{ item }">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-info">{{ formatNumber(item.totalProperties) }}</div>
                <div class="text-caption text-medium-emphasis">properties</div>
              </div>
            </template>

            <template #item.avgPrice="{ item }">
              <div class="text-center">
                <div class="text-body-1 font-weight-bold text-primary">{{ formatPrice(item.avgPrice) }}</div>
                <div class="text-caption text-medium-emphasis">average</div>
              </div>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                icon
                size="small"
                variant="text"
                color="primary"
                @click="viewCityDetails(item.city)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent" location="top">
                  View {{ item.city }} neighborhoods
                </v-tooltip>
              </v-btn>
            </template>
          </v-data-table>

          <!-- Additional Insights -->
          <v-row class="mt-6">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4">
                <v-card-title class="text-subtitle-1 pb-2">
                  <v-icon class="mr-2" color="success">mdi-trending-up</v-icon>
                  Top Performing Cities
                </v-card-title>
                <div v-for="city in topCities" :key="city.city" class="d-flex justify-space-between mb-2">
                  <span>{{ city.city }}</span>
                  <v-chip size="x-small" color="success" variant="flat">
                    {{ city.neighborhoodCount }} neighborhoods
                  </v-chip>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4">
                <v-card-title class="text-subtitle-1 pb-2">
                  <v-icon class="mr-2" color="warning">mdi-currency-usd</v-icon>
                  Price Ranges
                </v-card-title>
                <div class="d-flex justify-space-between mb-2">
                  <span>Highest Average:</span>
                  <span class="font-weight-bold text-warning">{{ formatPrice(totalStats.maxAvgPrice) }}</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span>Lowest Average:</span>
                  <span class="font-weight-bold text-success">{{ formatPrice(totalStats.minAvgPrice) }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span>Market Average:</span>
                  <span class="font-weight-bold text-primary">{{ formatPrice(totalStats.avgPrice) }}</span>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <v-icon size="64" class="mb-4" color="grey-lighten-1">mdi-city-variant-outline</v-icon>
          <h3 class="text-h6 mb-2">No Market Data Available</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Market overview data will appear here once neighborhoods are populated.
          </p>
          <v-btn color="primary" @click="loadData">Refresh Data</v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface CityStats {
  city: string
  neighborhoodCount: number
  minProperties: number
  maxProperties: number
  totalProperties: number
  minPrice: number
  maxPrice: number
  avgPrice: number
}

interface TotalStats {
  totalCities: number
  totalNeighborhoods: number
  totalProperties: number
  avgPrice: number
  minAvgPrice: number
  maxAvgPrice: number
}

const emit = defineEmits<{
  'city-selected': [city: string]
}>()

// Reactive data
const loading = ref(true)
const error = ref('')
const cityStats = ref<CityStats[]>([])
const totalStats = ref<TotalStats | null>(null)

// Table headers
const headers = [
  { title: 'City', key: 'city', sortable: true },
  { title: 'Neighborhoods', key: 'neighborhoodCount', sortable: true },
  { title: 'Property Range', key: 'propertyRange', sortable: false },
  { title: 'Total Properties', key: 'totalProperties', sortable: true },
  { title: 'Price Range', key: 'priceRange', sortable: false },
  { title: 'Avg Price', key: 'avgPrice', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const topCities = computed(() => {
  return [...cityStats.value]
    .sort((a, b) => b.neighborhoodCount - a.neighborhoodCount)
    .slice(0, 3)
})

// Methods
const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`
  }
  return `$${price.toLocaleString()}`
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const getNeighborhoodCountColor = (count: number): string => {
  if (count >= 10) return 'success'
  if (count >= 5) return 'warning'
  return 'info'
}

const viewCityDetails = (city: string) => {
  emit('city-selected', city)
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Fetch neighborhood statistics from API
    const response = await $fetch<{
      neighborhoods: any[]
      pagination: any
    }>('/api/neighborhoods?limit=1000')
    
    if (!response.neighborhoods?.length) {
      cityStats.value = []
      totalStats.value = null
      return
    }
    
    // Group neighborhoods by city and calculate statistics
    const cityGroups = response.neighborhoods.reduce((acc, neighborhood) => {
      const city = neighborhood.city
      if (!acc[city]) {
        acc[city] = []
      }
      acc[city].push(neighborhood)
      return acc
    }, {} as Record<string, any[]>)
    
    // Calculate city statistics
    const cityStatsData: CityStats[] = Object.entries(cityGroups).map(([city, neighborhoods]) => {
      const propertyCounts = neighborhoods.map(n => n.propertyCount || 0)
      const avgPrices = neighborhoods.map(n => n.averagePrice || 0).filter(p => p > 0)
      
      return {
        city,
        neighborhoodCount: neighborhoods.length,
        minProperties: Math.min(...propertyCounts),
        maxProperties: Math.max(...propertyCounts),
        totalProperties: propertyCounts.reduce((sum, count) => sum + count, 0),
        minPrice: Math.min(...avgPrices),
        maxPrice: Math.max(...avgPrices),
        avgPrice: avgPrices.reduce((sum, price) => sum + price, 0) / avgPrices.length
      }
    })
    
    cityStats.value = cityStatsData
    
    // Calculate total statistics
    const allAvgPrices = cityStatsData.map(c => c.avgPrice).filter(p => p > 0)
    totalStats.value = {
      totalCities: cityStatsData.length,
      totalNeighborhoods: cityStatsData.reduce((sum, city) => sum + city.neighborhoodCount, 0),
      totalProperties: cityStatsData.reduce((sum, city) => sum + city.totalProperties, 0),
      avgPrice: allAvgPrices.reduce((sum, price) => sum + price, 0) / allAvgPrices.length,
      minAvgPrice: Math.min(...allAvgPrices),
      maxAvgPrice: Math.max(...allAvgPrices)
    }
    
  } catch (err) {
    error.value = 'Failed to load market overview data'
    console.error('Error loading neighborhood stats:', err)
  } finally {
    loading.value = false
  }
}

// Load data on mount
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.neighborhood-market-overview {
  width: 100%;
}

:deep(.v-data-table) {
  border-radius: 8px;
}

:deep(.v-data-table thead th) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-weight: 600;
}

:deep(.v-data-table tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

:deep(.v-card-title) {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
}
</style>

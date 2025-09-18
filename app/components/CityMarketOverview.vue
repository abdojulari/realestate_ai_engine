<template>
  <div class="city-market-overview">
    <v-card class="elevation-3">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-city</v-icon>
        <span class="text-h5">Alberta Real Estate Market Overview</span>
        <v-spacer />
        <v-chip
          v-if="totalStats"
          color="primary"
          variant="outlined"
          size="small"
        >
          {{ totalStats.totalProperties.toLocaleString() }} Properties
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

        <!-- Data Content -->
        <div v-else-if="cityStats.length > 0">
          <!-- Summary Stats -->
          <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-primary font-weight-bold">{{ totalStats.totalCities }}</div>
                <div class="text-caption text-medium-emphasis">Cities & Areas</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-success font-weight-bold">{{ totalStats.totalProperties.toLocaleString() }}</div>
                <div class="text-caption text-medium-emphasis">Total Properties</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-info font-weight-bold">{{ totalStats.avgPropertiesPerCity }}</div>
                <div class="text-caption text-medium-emphasis">Avg per City</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card variant="outlined" class="text-center pa-4">
                <div class="text-h4 text-warning font-weight-bold">{{ formatNumber(totalStats.maxProperties) }}</div>
                <div class="text-caption text-medium-emphasis">Largest City</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Search and Filter -->
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="searchQuery"
                label="Search cities..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="filterSize"
                :items="sizeFilters"
                label="Filter by size"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
          </v-row>

          <!-- Data Table -->
          <v-data-table
            :headers="headers"
            :items="filteredCityStats"
            :items-per-page="25"
            class="elevation-1"
            item-value="city"
            :sort-by="[{ key: 'propertyCount', order: 'desc' }]"
            :search="searchQuery"
          >
            <template #item.city="{ item }">
              <div class="d-flex align-center">
                <v-icon 
                  class="mr-2" 
                  size="20" 
                  :color="getCityIconColor(item.propertyCount)"
                >
                  {{ getCityIcon(item.city) }}
                </v-icon>
                <div>
                  <div class="font-weight-medium">{{ item.city }}</div>
                  <div class="text-caption text-medium-emphasis">{{ getCityType(item.city) }}</div>
                </div>
              </div>
            </template>

            <template #item.propertyCount="{ item }">
              <div class="text-center">
                <v-chip
                  :color="getPropertyCountColor(item.propertyCount)"
                  variant="flat"
                  size="small"
                >
                  {{ item.propertyCount.toLocaleString() }}
                </v-chip>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ getMarketShare(item.propertyCount) }}% of market
                </div>
              </div>
            </template>

            <template #item.marketCategory="{ item }">
              <v-chip
                :color="getCategoryColor(item.marketCategory)"
                variant="outlined"
                size="small"
              >
                {{ item.marketCategory }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                icon
                size="small"
                variant="text"
                color="primary"
                @click="viewCityProperties(item.city)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent" location="top">
                  View {{ item.city }} properties
                </v-tooltip>
              </v-btn>
            </template>
          </v-data-table>

          <!-- Top Cities Insight -->
          <v-row class="mt-6">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4">
                <v-card-title class="text-subtitle-1 pb-2">
                  <v-icon class="mr-2" color="success">mdi-trending-up</v-icon>
                  Major Markets (1000+ Properties)
                </v-card-title>
                <div v-for="city in majorMarkets" :key="city.city" class="d-flex justify-space-between mb-2">
                  <span>{{ city.city }}</span>
                  <v-chip size="x-small" color="success" variant="flat">
                    {{ city.propertyCount.toLocaleString() }}
                  </v-chip>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4">
                <v-card-title class="text-subtitle-1 pb-2">
                  <v-icon class="mr-2" color="info">mdi-chart-pie</v-icon>
                  Market Distribution
                </v-card-title>
                <div class="d-flex justify-space-between mb-2">
                  <span>Major Cities (1000+):</span>
                  <span class="font-weight-bold">{{ majorMarkets.length }} cities</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span>Medium Cities (100-999):</span>
                  <span class="font-weight-bold">{{ mediumMarkets.length }} cities</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span>Small Cities (1-99):</span>
                  <span class="font-weight-bold">{{ smallMarkets.length }} cities</span>
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
            Market overview data will appear here once properties are available.
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
  propertyCount: number
  marketCategory: 'Major' | 'Medium' | 'Small'
}

interface TotalStats {
  totalCities: number
  totalProperties: number
  avgPropertiesPerCity: number
  maxProperties: number
}

const emit = defineEmits<{
  'city-selected': [city: string]
}>()

// Reactive data
const loading = ref(true)
const error = ref('')
const cityStats = ref<CityStats[]>([])
const totalStats = ref<TotalStats | null>(null)
const searchQuery = ref('')
const filterSize = ref('')

// Filter options
const sizeFilters = [
  { title: 'Major Markets (1000+)', value: 'major' },
  { title: 'Medium Markets (100-999)', value: 'medium' },
  { title: 'Small Markets (1-99)', value: 'small' }
]

// Table headers
const headers = [
  { title: 'City/Area', key: 'city', sortable: true },
  { title: 'Properties', key: 'propertyCount', sortable: true },
  { title: 'Market Size', key: 'marketCategory', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const filteredCityStats = computed(() => {
  let filtered = cityStats.value
  
  if (filterSize.value) {
    filtered = filtered.filter(city => {
      switch (filterSize.value) {
        case 'major': return city.propertyCount >= 1000
        case 'medium': return city.propertyCount >= 100 && city.propertyCount < 1000
        case 'small': return city.propertyCount < 100
        default: return true
      }
    })
  }
  
  return filtered
})

const majorMarkets = computed(() => {
  return cityStats.value.filter(city => city.propertyCount >= 1000)
})

const mediumMarkets = computed(() => {
  return cityStats.value.filter(city => city.propertyCount >= 100 && city.propertyCount < 1000)
})

const smallMarkets = computed(() => {
  return cityStats.value.filter(city => city.propertyCount < 100)
})

// Methods
const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const getCityIcon = (city: string): string => {
  if (city.toLowerCase().includes('rural')) return 'mdi-barn'
  if (city === 'Calgary' || city === 'Edmonton') return 'mdi-city'
  return 'mdi-home-city-outline'
}

const getCityIconColor = (propertyCount: number): string => {
  if (propertyCount >= 1000) return 'success'
  if (propertyCount >= 100) return 'warning'
  return 'info'
}

const getCityType = (city: string): string => {
  if (city.toLowerCase().includes('rural')) return 'Rural Area'
  if (city === 'Calgary' || city === 'Edmonton') return 'Major City'
  return 'City/Town'
}

const getPropertyCountColor = (count: number): string => {
  if (count >= 1000) return 'success'
  if (count >= 100) return 'warning'
  if (count >= 50) return 'info'
  return 'default'
}

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Major': return 'success'
    case 'Medium': return 'warning'
    case 'Small': return 'info'
    default: return 'default'
  }
}

const getMarketShare = (count: number): string => {
  if (!totalStats.value) return '0'
  return ((count / totalStats.value.totalProperties) * 100).toFixed(1)
}

const viewCityProperties = (city: string) => {
  emit('city-selected', city)
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Fetch city statistics from properties API
    const response = await $fetch<any>('/api/properties/city-stats')
    
    if (!response?.cities?.length) {
      cityStats.value = []
      totalStats.value = null
      return
    }
    
    // Process city statistics
    const cityStatsData: CityStats[] = response.cities.map((city: any) => {
      let marketCategory: 'Major' | 'Medium' | 'Small'
      if (city.propertyCount >= 1000) {
        marketCategory = 'Major'
      } else if (city.propertyCount >= 100) {
        marketCategory = 'Medium'
      } else {
        marketCategory = 'Small'
      }
      
      return {
        city: city.city,
        propertyCount: city.propertyCount,
        marketCategory
      }
    })
    
    cityStats.value = cityStatsData
    
    // Calculate total statistics
    totalStats.value = {
      totalCities: cityStatsData.length,
      totalProperties: cityStatsData.reduce((sum, city) => sum + city.propertyCount, 0),
      avgPropertiesPerCity: Math.round(cityStatsData.reduce((sum, city) => sum + city.propertyCount, 0) / cityStatsData.length),
      maxProperties: Math.max(...cityStatsData.map(city => city.propertyCount))
    }
    
  } catch (err) {
    error.value = 'Failed to load market overview data'
    console.error('Error loading city stats:', err)
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
.city-market-overview {
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

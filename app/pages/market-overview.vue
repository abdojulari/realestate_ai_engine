<template>
  <div class="market-overview-page">
    <!-- Hero Section -->
    <section class="hero-section bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
      <v-container>
        <v-row align="center" justify="center" class="text-center">
          <v-col cols="12" md="8">
            <h1 class="text-h3 mb-4 font-weight-bold">Alberta Real Estate Market Overview</h1>
            <p class="text-h6 mb-0 opacity-90">
              Comprehensive neighborhood and pricing insights across Alberta cities
            </p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Main Content -->
    <section class="content-section py-8">
      <v-container>
        <v-row>
          <v-col cols="12">
            <!-- City Market Overview Component (Real Data) -->
            <CityMarketOverview 
              @city-selected="handleCitySelected"
            />
          </v-col>
        </v-row>
        
        <!-- Neighborhood Section (Limited Sample Data) -->
        <v-row class="mt-8" v-if="showNeighborhoodData">
          <v-col cols="12">
            <v-alert
              type="info"
              variant="tonal"
              class="mb-4"
            >
              <v-alert-title>Neighborhood Data</v-alert-title>
              The neighborhood breakdown below shows sample data for select cities. 
              We're working on expanding neighborhood coverage across all Alberta cities.
            </v-alert>
            <NeighborhoodMarketOverview 
              @city-selected="handleCitySelected"
            />
          </v-col>
        </v-row>

        <!-- City Details Modal -->
        <v-dialog
          v-model="showCityDialog"
          max-width="800px"
          scrollable
        >
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-city</v-icon>
              <span>{{ selectedCity }} Neighborhoods</span>
              <v-spacer />
              <v-btn
                icon
                variant="text"
                @click="showCityDialog = false"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>

            <v-card-text>
              <div v-if="loadingCityDetails" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
                <p class="mt-3">Loading {{ selectedCity }} neighborhoods...</p>
              </div>

              <div v-else-if="cityNeighborhoods.length > 0">
                <v-data-table
                  :headers="cityDetailHeaders"
                  :items="cityNeighborhoods"
                  :items-per-page="10"
                  class="elevation-1"
                >
                  <template #item.name="{ item }">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" size="16" color="success">mdi-home-group</v-icon>
                      <span class="font-weight-medium">{{ item.name }}</span>
                    </div>
                  </template>

                  <template #item.propertyCount="{ item }">
                    <v-chip
                      :color="getPropertyCountColor(item.propertyCount)"
                      variant="flat"
                      size="small"
                    >
                      {{ item.propertyCount }}
                    </v-chip>
                  </template>

                  <template #item.averagePrice="{ item }">
                    <span class="font-weight-bold text-primary">
                      {{ formatPrice(item.averagePrice) }}
                    </span>
                  </template>
                </v-data-table>
              </div>

              <div v-else class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-home-search-outline</v-icon>
                <p class="mt-3">No neighborhoods found for {{ selectedCity }}</p>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                variant="outlined"
                @click="searchPropertiesInCity"
              >
                <v-icon start>mdi-magnify</v-icon>
                Search Properties in {{ selectedCity }}
              </v-btn>
              <v-btn
                color="primary"
                @click="showCityDialog = false"
              >
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
// Page meta
definePageMeta({
  title: 'Market Overview - Alberta Real Estate',
  description: 'Comprehensive overview of Alberta real estate market by neighborhoods and cities'
})

// Reactive data
const showCityDialog = ref(false)
const selectedCity = ref('')
const loadingCityDetails = ref(false)
const cityNeighborhoods = ref<any[]>([])
const showNeighborhoodData = ref(false) // Toggle to show neighborhood section

// City detail table headers
const cityDetailHeaders = [
  { title: 'Neighborhood', key: 'name', sortable: true },
  { title: 'Properties', key: 'propertyCount', sortable: true },
  { title: 'Average Price', key: 'averagePrice', sortable: true }
]

// Methods
const formatPrice = (price: number): string => {
  if (!price) return 'N/A'
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`
  }
  return `$${price.toLocaleString()}`
}

const getPropertyCountColor = (count: number): string => {
  if (count >= 50) return 'success'
  if (count >= 25) return 'warning'
  if (count >= 10) return 'info'
  return 'default'
}

const handleCitySelected = async (city: string) => {
  selectedCity.value = city
  showCityDialog.value = true
  loadingCityDetails.value = true
  
  try {
    const response = await $fetch<{
      neighborhoods: any[]
      pagination: any
    }>(`/api/neighborhoods?city=${encodeURIComponent(city)}&limit=100`)
    
    cityNeighborhoods.value = response.neighborhoods || []
  } catch (error) {
    console.error('Error loading city neighborhoods:', error)
    cityNeighborhoods.value = []
  } finally {
    loadingCityDetails.value = false
  }
}

const searchPropertiesInCity = () => {
  // Navigate to properties page with city filter
  navigateTo({
    path: '/properties',
    query: {
      city: selectedCity.value
    }
  })
  showCityDialog.value = false
}

// SEO
useHead({
  title: 'Alberta Market Overview - Real Estate Insights by City & Neighborhood',
  meta: [
    {
      name: 'description',
      content: 'Explore comprehensive Alberta real estate market data including neighborhood statistics, property counts, and average prices across major cities like Calgary, Edmonton, and more.'
    },
    {
      name: 'keywords',
      content: 'Alberta real estate, market overview, neighborhood statistics, Calgary properties, Edmonton real estate, property prices'
    }
  ]
})
</script>

<style scoped>
.market-overview-page {
  min-height: 100vh;
  background-color: #f8fafc;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.content-section {
  position: relative;
  z-index: 1;
}

:deep(.v-dialog .v-card) {
  border-radius: 12px;
}
</style>

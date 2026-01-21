<template>
  <div class="market-overview-page">
    <!-- Hero Section with Premium Gradient & Texture -->
    <section class="hero-section text-white overflow-hidden">
      <div class="hero-bg-overlay"></div>
      <v-container class="relative py-16">
        <v-row align="center" justify="center" class="text-center">
          <v-col cols="12" md="10" lg="8">
            <v-chip
              color="white"
              variant="outlined"
              size="small"
              class="mb-6 px-4 py-3 text-uppercase tracking-widest font-weight-bold"
              style="border-color: rgba(255,255,255,0.4) !important;"
            >
              Market Insights
            </v-chip>
            <h1 class="premium-title text-h3 text-sm-h2 mb-6">
              Alberta Real Estate <br class="hidden-sm-and-down" />
              <span class="text-italic font-weight-light">Market Intelligence</span>
            </h1>
            <p class="text-subtitle-1 text-md-h6 mb-0 opacity-80 max-w-700 mx-auto font-weight-light">
              Access comprehensive neighborhood analytics and pricing trends across Alberta's most vibrant cities.
            </p>
          </v-col>
        </v-row>
      </v-container>
      
      <!-- Decorative Abstract Element -->
      <div class="decorative-circle top-right"></div>
      <div class="decorative-circle bottom-left"></div>
    </section>

    <!-- Main Content with Refined Spacing -->
    <section class="content-section pb-16">
      <v-container>
        <v-row class="mt-n10">
          <v-col cols="12">
            <!-- Market Overview Component Wrapper -->
            <v-card class="premium-glass-card pa-2" elevation="24">
              <CityMarketOverview 
                @city-selected="handleCitySelected"
              />
            </v-card>
          </v-col>
        </v-row>
        
        <!-- Neighborhood Section: Refined Design -->
        <v-row class="mt-12" v-if="showNeighborhoodData">
          <v-col cols="12">
            <div class="section-header mb-8 d-flex align-center">
              <div>
                <h2 class="text-h4 font-weight-bold mb-2">Neighborhood Breakdown</h2>
                <div class="section-line"></div>
              </div>
              <v-spacer />
              <v-chip size="small" color="blue-darken-4" variant="tonal" prepend-icon="mdi-chart-bell-curve">
                Beta Access
              </v-chip>
            </div>

            <v-alert
              border="start"
              color="blue-darken-3"
              theme="dark"
              variant="flat"
              class="mb-8 rounded-xl elevation-4"
              icon="mdi-lightbulb-on-outline"
            >
              <div class="text-h6 font-weight-bold">Insights Expanding</div>
              <div class="text-body-2 opacity-90">
                We are currently indexing localized data. The following metrics represent curated sample sets for key Alberta regions.
              </div>
            </v-alert>

            <v-card class="premium-glass-card pa-2" elevation="12">
              <NeighborhoodMarketOverview 
                @city-selected="handleCitySelected"
              />
            </v-card>
          </v-col>
        </v-row>

        <!-- City Details Modal: High End Refinement -->
        <v-dialog
          v-model="showCityDialog"
          max-width="850px"
          scrollable
          transition="dialog-bottom-transition"
          class="premium-dialog"
        >
          <v-card class="rounded-xl overflow-hidden">
            <v-card-title class="pa-6 d-flex align-center bg-grey-lighten-4">
              <div class="d-flex align-center">
                <v-avatar color="black" size="48" class="mr-4">
                  <v-icon color="white">mdi-city-variant-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline leading-none mb-1">CITY ANALYTICS</div>
                  <div class="text-h5 font-weight-black">{{ selectedCity }}</div>
                </div>
              </div>
              <v-spacer />
              <v-btn
                icon="mdi-close"
                variant="tonal"
                color="grey-darken-3"
                @click="showCityDialog = false"
              />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0">
              <div v-if="loadingCityDetails" class="text-center py-16">
                <v-progress-circular indeterminate color="black" size="64" width="2" />
                <p class="mt-6 text-overline tracking-widest">Gathering intelligence...</p>
              </div>

              <div v-else-if="cityNeighborhoods.length > 0">
                <v-data-table
                  :headers="cityDetailHeaders"
                  :items="cityNeighborhoods"
                  :items-per-page="10"
                  class="premium-table"
                  hover
                >
                  <template #item.name="{ item }">
                    <div class="py-3">
                      <div class="text-subtitle-1 font-weight-bold">{{ item.name }}</div>
                      <div class="text-caption text-medium-emphasis">Residential Zone</div>
                    </div>
                  </template>

                  <template #item.propertyCount="{ item }">
                    <v-chip
                      :color="getPropertyCountColor(item.propertyCount)"
                      variant="tonal"
                      size="small"
                      class="font-weight-black"
                    >
                      {{ item.propertyCount }} Active
                    </v-chip>
                  </template>

                  <template #item.averagePrice="{ item }">
                    <div class="text-right">
                      <div class="text-subtitle-1 font-weight-black text-blue-darken-4">
                        {{ formatPrice(item.averagePrice) }}
                      </div>
                      <div class="text-tiny text-uppercase tracking-tighter text-grey">Avg Listing</div>
                    </div>
                  </template>
                </v-data-table>
              </div>

              <div v-else class="text-center py-16 px-6">
                <v-icon size="64" color="grey-lighten-2">mdi-database-off-outline</v-icon>
                <h3 class="text-h6 font-weight-bold mt-4">No Localized Data Found</h3>
                <p class="text-body-2 text-medium-emphasis">We're still collecting neighborhood-level metrics for {{ selectedCity }}.</p>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-6 bg-white">
              <v-btn
                color="black"
                variant="flat"
                size="large"
                block
                rounded="lg"
                class="text-none font-weight-bold"
                @click="searchPropertiesInCity"
              >
                Browse All Properties in {{ selectedCity }}
                <v-icon end icon="mdi-arrow-right" size="small" class="ml-2" />
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  title: 'Market Overview - Alberta Real Estate',
  description: 'Comprehensive overview of Alberta real estate market by neighborhoods and cities'
})

const showCityDialog = ref(false)
const selectedCity = ref('')
const loadingCityDetails = ref(false)
const cityNeighborhoods = ref<any[]>([])
const showNeighborhoodData = ref(false)

const cityDetailHeaders = [
  { title: 'Neighborhood', key: 'name', sortable: true, align: 'start' as const },
  { title: 'Availability', key: 'propertyCount', sortable: true, align: 'center' as const },
  { title: 'Market Value', key: 'averagePrice', sortable: true, align: 'end' as const }
]

const formatPrice = (price: number): string => {
  if (!price) return 'N/A'
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`
  }
  return `$${price.toLocaleString()}`
}

const getPropertyCountColor = (count: number): string => {
  if (count >= 50) return 'blue-darken-4'
  if (count >= 25) return 'blue-darken-1'
  if (count >= 10) return 'blue-lighten-1'
  return 'grey'
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
  navigateTo({
    path: '/properties',
    query: { city: selectedCity.value }
  })
  showCityDialog.value = false
}

useHead({
  title: 'Alberta Real Estate Intelligence | Market Overview',
  meta: [
    { name: 'description', content: 'Explore high-fidelity market data for Alberta real estate. Detailed neighborhood stats, average pricing, and inventory levels for Calgary, Edmonton, and surrounding areas.' }
  ]
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');

.market-overview-page {
  min-height: 100vh;
  background-color: #f1f5f9;
}

.premium-title {
  font-family: 'Playfair Display', serif;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.hero-section {
  background: #0f172a;
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
}

.hero-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  opacity: 0.95;
}

/* Glassmorphism Elements */
.premium-glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1) !important;
}

.section-line {
  width: 60px;
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
}

.decorative-circle {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), transparent);
  z-index: 0;
}

.top-right { top: -100px; right: -50px; }
.bottom-left { bottom: -100px; left: -50px; }

.max-w-700 { max-width: 700px; }

.text-italic { font-style: italic; }

.tracking-widest { letter-spacing: 0.2em; }
.tracking-tighter { letter-spacing: -0.05em; }

.premium-table :deep(thead th) {
  font-weight: 800 !important;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: #64748b !important;
  background-color: #f8fafc !important;
  border-bottom: 2px solid #e2e8f0 !important;
}

.premium-table :deep(tbody tr:hover) {
  background-color: #f1f5f9 !important;
}

.text-tiny { font-size: 0.65rem; }

@media (max-width: 600px) {
  .hero-section {
    min-height: 300px;
  }
}
</style>
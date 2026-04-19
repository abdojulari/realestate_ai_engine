<template>
  <div class="ai-search-page">
    <!-- License Gate - Check if AI Search feature is available -->
    <FeatureGate :feature="FEATURES.AI_SEARCH" :show-upgrade-prompt="true">
      <!-- Feature Available: Show AI Search Interface -->
      <!-- Hero Section with Premium Blur Background -->
      <section class="hero-section text-white py-16 relative overflow-hidden">
        <div class="hero-blur-bg"></div>
        <v-container class="relative z-10">
          <v-row align="center" justify="center" class="text-center">
            <v-col cols="12" md="10" lg="8">
              <div class="ai-chip mb-6 mx-auto">
                <v-icon size="small" class="mr-2">mdi-sparkles</v-icon>
                NEXT-GEN REAL ESTATE SEARCH
              </div>
              <h1 class="premium-title mb-6">Find Your Future with <span class="gradient-text">Intelligence</span></h1>
              <p class="text-h6 font-weight-light opacity-80 mb-0 px-md-16">
                Skip the traditional filters. Describe your dream lifestyle in plain English and let our neural engine curate the perfect match.
              </p>
            </v-col>
          </v-row>
        </v-container>
      </section>

    <!-- Main Interface -->
    <v-container class="mt-n12 pb-16 relative z-20">
      <!-- Market Insights Panel — full-width, top of page -->
      <v-row class="mb-6">
        <v-col cols="12">
          <MarketInsightsPanel :city="selectedCity" />
        </v-col>
      </v-row>

      <v-row>
        <!-- Search Controls -->
        <v-col cols="12" lg="8">
          <v-card flat class="premium-search-card mb-8">
            <div class="pa-6 pa-md-10">
              <!-- Location Row -->
              <v-row class="mb-6">
                <v-col cols="12" md="6">
                  <v-select density="compact"
                    v-model="selectedCity"
                    :items="cities"
                    item-title="name"
                    item-value="name"
                    label="Target City"
                    variant="filled"
                    class="premium-select"
                    prepend-inner-icon="mdi-map-marker-outline"
                    :loading="loadingCities"
                    clearable
                    hide-details
                  >
                    <template v-slot:selection="{ item }">
                      <span>{{ item.raw.name }} ({{ item.raw.count }} properties)</span>
                    </template>
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props" :title="`${item.raw.name} (${item.raw.count} properties)`" />
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <NeighborhoodDropdown
                    v-model="selectedNeighborhoodName"
                    label="Neighborhood"
                    placeholder="Select specific neighborhood..."
                    :city-filter="selectedCity"
                    @neighborhood-selected="onNeighborhoodSelected"
                  />
                </v-col>
              </v-row>

              <!-- AI Input -->
              <div class="input-wrapper relative mb-6">
                <v-textarea density="compact"
                  v-model="searchQuery"
                  placeholder="e.g. A modern 3-bedroom penthouse with floor-to-ceiling windows, a chef's kitchen, and a private balcony overlooking the city skyline..."
                  variant="outlined"
                  auto-grow
                  rows="4"
                  class="premium-textarea"
                  persistent-placeholder
                  :disabled="searching"
                  hide-details
                  @keyup.enter.ctrl="searchWithAI"
                />
                
                <!-- Example Queries -->
                <div class="example-queries mt-4">
                  <p class="text-caption text-grey mb-2">QUICK EXAMPLES:</p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-chip 
                      v-for="example in exampleQueries" 
                      :key="example"
                      size="small"
                      variant="outlined"
                      @click="searchQuery = example"
                      class="example-chip"
                    >
                      {{ example }}
                    </v-chip>
                  </div>
                </div>

                  <div class="input-footer d-flex flex-wrap align-center justify-space-between pt-6">
                    <div class="d-flex align-center gap-4 mb-4 mb-sm-0">
                      <div class="voice-trigger d-flex align-center">
                        <v-btn 
                          :icon="isListening ? 'mdi-microphone' : 'mdi-microphone-outline'" 
                          variant="tonal" 
                          :color="isListening ? 'error' : 'black'" 
                          density="comfortable"
                          @click="toggleSpeechRecognition"
                          :disabled="searching"
                          :class="{ 'listening-animation': isListening }"
                        >
                          <v-icon :class="{ 'pulse-icon': isListening }">
                            {{ isListening ? 'mdi-microphone' : 'mdi-microphone-outline' }}
                          </v-icon>
                        </v-btn>
                        <span class="text-caption font-weight-bold ml-2 text-uppercase tracking-widest">
                          {{ isListening ? 'Listening...' : 'Voice' }}
                        </span>
                      </div>
                      <v-divider vertical class="mx-2" />
                      <div class="d-flex align-center">
                        <v-icon size="small" color="grey" class="mr-2">mdi-information-outline</v-icon>
                        <span class="text-caption text-grey">Ctrl + Enter to search</span>
                      </div>
                    </div>
                  
                  <div class="d-flex gap-2">
                    
                    <v-btn
                      :loading="searching"
                      color="black"
                      class="search-btn-premium px-10"
                      height="60"
                      flat
                      :disabled="!searchQuery.trim()"
                      @click="searchWithAI"
                    >
                      <v-icon start icon="mdi-auto-fix" class="mr-3" />
                      Neural Search
                    </v-btn>
                    
                    <!-- Alert Scheduling Button -->
                    <v-btn
                      v-if="searchResults.length > 0"
                      color="success"
                      variant="outlined"
                      height="56"
                      class="px-6"
                      @click="openAlertDialog"
                    >
                      <v-icon start>mdi-bell-plus</v-icon>
                      Alerts
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Error Display -->
              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mt-4"
                closable
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </v-alert>
            </div>
          </v-card>

          <!-- Loading State Overlay -->
          <v-fade-transition>
            <div v-if="searching" class="search-loader py-16 text-center">
              <v-progress-circular indeterminate color="black" size="64" width="2" />
              <div class="mt-6 text-h6 font-weight-light">Analyzing your requirements...</div>
            </div>
          </v-fade-transition>

          <!-- No Results / Empty State -->
          <div v-if="!searching && searchResults.length === 0 && totalProperties === 0 && searchQuery" class="mt-12">
            <v-card class="text-center pa-8 pa-md-12 rounded-xl" variant="outlined">
              <v-avatar size="120" color="grey-lighten-4" class="mb-6">
                <v-icon size="60" color="grey-lighten-1">mdi-home-search-outline</v-icon>
              </v-avatar>
              <h3 class="text-h5 font-weight-bold mb-2">No Properties Found</h3>
              <p class="text-body-1 text-grey mb-6">
                We couldn't find any properties matching your search criteria in 
                <strong>{{ selectedNeighborhoodName ? 'the selected neighborhood' : (selectedCity || 'the selected area') }}</strong>.
              </p>
              
              <v-card color="grey-lighten-4" flat class="pa-6 rounded-xl border mb-6 text-left">
                <div class="d-flex align-center mb-4">
                  <v-icon color="black" class="mr-2">mdi-lightbulb-on</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">TRY THESE SUGGESTIONS</span>
                </div>
                <ul class="text-body-2 text-medium-emphasis mb-0 leading-relaxed">
                  <li v-if="selectedNeighborhoodName" class="mb-2">Remove the neighborhood filter to search the entire city</li>
                  <li v-if="selectedCity" class="mb-2">Remove the city filter to search all cities</li>
                  <li class="mb-2">Adjust your search query (e.g., try "3 bedroom" instead of "4 bedroom")</li>
                  <li class="mb-2">Remove specific features like "garage" or "basement"</li>
                  <li>Try a more general search query</li>
                </ul>
              </v-card>
              
              <div class="d-flex flex-wrap justify-center gap-2">
                <v-btn
                  v-if="selectedNeighborhoodName"
                  color="black"
                  variant="outlined"
                  rounded="lg"
                  @click="selectedNeighborhoodName = null; searchWithAI(1)"
                >
                  <v-icon start>mdi-filter-remove</v-icon>
                  Search Entire City
                </v-btn>
                <v-btn
                  v-if="selectedCity && !selectedNeighborhoodName"
                  color="black" 
                  variant="outlined"
                  rounded="lg"
                  @click="selectedCity = ''; searchWithAI(1)"
                >
                  <v-icon start>mdi-map-marker-off</v-icon>
                  Search All Cities
                </v-btn>
                <v-btn 
                  color="black" 
                  variant="outlined"
                  rounded="lg"
                  @click="searchQuery = ''; searchResults = []; totalProperties = 0"
                >
                  <v-icon start>mdi-refresh</v-icon>
                  New Search
                </v-btn>
              </div>
            </v-card>
          </div>

          <!-- Initial Empty State -->
          <div v-else-if="!searching && searchResults.length === 0 && !searchQuery" class="mt-12 text-center py-16 rounded-xl empty-state-border">
            <v-avatar size="120" color="grey-lighten-4" class="mb-6">
              <v-icon size="60" color="grey-lighten-1">mdi-brain</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold mb-2">Ready to explore?</h3>
            <p class="text-body-1 text-grey mb-0">Enter your dream home description above to begin.</p>
          </div>

          <!-- Results Section -->
          <div v-if="searchResults.length > 0 && !searching" class="mt-12">
            <div class="d-flex align-center mb-10">
              <div>
                <h2 class="text-h4 font-weight-bold">Curated Matches</h2>
                <div class="text-subtitle-2 text-grey-darken-1">{{ totalProperties.toLocaleString() }} properties found based on your description</div>
              </div>
              <v-spacer />
              <div class="d-flex align-center ga-2">
                <v-chip v-if="selectedCity" color="info" variant="tonal" class="font-weight-bold">
                  <v-icon start size="small">mdi-map-marker</v-icon>
                  {{ selectedCity }}
                </v-chip>
                <v-chip color="success" variant="tonal" class="font-weight-bold">
                  Showing {{ searchResults.length }}
                </v-chip>
              </div>
            </div>

            <v-row>
              <v-col 
                v-for="property in searchResults" 
                :key="property.id"
                cols="12" 
                md="6"
              >
                <PropertyCard :property="property" />
              </v-col>
            </v-row>

            <!-- Pagination Controls -->
            <div v-if="totalPages > 1 && totalProperties > itemsPerPage" class="mt-16 d-flex justify-center">
              <v-pagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="5"
                active-color="black"
                rounded="lg"
                @update:model-value="handlePageChange"
              />
            </div>
          </div>
        </v-col>

        <!-- Sidebar Guide -->
        <v-col cols="12" lg="4">
          <div class="sticky-sidebar">
            <v-card flat border class="sidebar-guide-premium pa-8 rounded-xl">
              <div class="section-label mb-2">INTELLIGENT SEARCH</div>
              <h3 class="text-h5 font-weight-bold mb-8">How it works</h3>
              
              <div class="steps-container">
                <!-- Step 1 -->
                <div class="step-item d-flex align-start mb-8">
                  <div class="step-circle mr-4">
                    <v-icon 
                      v-if="step1Completed"
                      color="success" 
                      size="18"
                    >
                      mdi-check
                    </v-icon>
                    <v-icon v-else size="18">mdi-comment-text-outline</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold mb-1">Natural Request</div>
                    <div 
                      class="text-body-2 text-medium-emphasis typewriter-text"
                      :class="{ 'text-success': step1Completed }"
                    >
                      {{ step1Text }}
                    </div>
                  </div>
                </div>

                <!-- Step 2 -->
                <div v-if="step1Completed || step2Text" class="step-item d-flex align-start mb-8">
                  <div class="step-circle mr-4">
                    <v-icon 
                      v-if="step2Completed"
                      color="success" 
                      size="18"
                    >
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="step2Text" size="18">mdi-brain</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold mb-1">Neural Analysis</div>
                    <div 
                      class="text-body-2 text-medium-emphasis typewriter-text"
                      :class="{ 'text-success': step2Completed }"
                    >
                      {{ step2Text }}
                    </div>
                  </div>
                </div>

                <!-- Step 3 -->
                <div v-if="step2Completed || step3Text" class="step-item d-flex align-start mb-8">
                  <div class="step-circle mr-4">
                    <v-icon 
                      v-if="step3Completed"
                      color="success" 
                      size="18"
                    >
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="step3Text" size="18">mdi-auto-fix</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold mb-1">Live Curation</div>
                    <div 
                      class="text-body-2 text-medium-emphasis typewriter-text"
                      :class="{ 'text-success': step3Completed }"
                    >
                      {{ step3Text }}
                    </div>
                  </div>
                </div>

                <!-- Step 4 -->
                <div v-if="step3Completed || step4Text" class="step-item d-flex align-start mb-8">
                  <div class="step-circle mr-4">
                    <v-icon 
                      v-if="step4Completed"
                      color="success" 
                      size="18"
                    >
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="step4Text" size="18">mdi-view-grid-outline</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold mb-1">Browse Results</div>
                    <div 
                      class="text-body-2 text-medium-emphasis typewriter-text"
                      :class="{ 'text-success': step4Completed }"
                    >
                      {{ step4Text }}
                    </div>
                  </div>
                </div>

                <!-- Step 5 -->
                <div v-if="step4Completed || step5Text" class="step-item d-flex align-start mb-8">
                  <div class="step-circle mr-4">
                    <v-icon 
                      v-if="step5Completed"
                      color="success" 
                      size="18"
                    >
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="step5Text" size="18">mdi-bell-outline</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold mb-1">Stay Updated</div>
                    <div 
                      class="text-body-2 text-medium-emphasis typewriter-text"
                      :class="{ 'text-success': step5Completed }"
                    >
                      {{ step5Text }}
                    </div>
                  </div>
                </div>
              </div>

              <v-divider class="my-8" />

              <v-card color="grey-lighten-4" flat class="pa-6 rounded-xl border">
                <div class="d-flex align-center mb-4">
                  <v-icon color="black" class="mr-2">mdi-creation</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">ADVANCED TIP</span>
                </div>
                <p class="text-body-2 text-medium-emphasis mb-0 leading-relaxed">
                  The more specific you are about <strong>materials</strong> (e.g., hardwood floors), <strong>lifestyle</strong> (e.g., quiet home office), and <strong>location</strong>, the better the matches.
                </p>
              </v-card>
              </v-card>

          </div>
        </v-col>
      </v-row>
    </v-container>

    <!-- Property Alert Dialog -->
    <v-dialog v-model="showAlertDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-3" color="success">mdi-bell-ring</v-icon>
          Create Property Alert
        </v-card-title>
        
        <v-card-text>
          <!-- Authentication Check -->
          <div v-if="!isAuthenticated" class="auth-required mb-6">
            <v-alert type="info" variant="tonal">
              <div class="d-flex align-center">
                <v-icon class="mr-3">mdi-account-lock</v-icon>
                <div>
                  <div class="font-weight-medium">Login Required</div>
                  <div class="text-body-2">Please log in to create property alerts and receive notifications.</div>
                </div>
              </div>
            </v-alert>
            
            <div class="text-center mt-4">
              <v-btn color="primary" @click="goToLogin">
                <v-icon start>mdi-login</v-icon>
                Login / Sign Up
              </v-btn>
            </div>
          </div>

          <!-- Alert Setup (for authenticated users) -->
          <div v-else>
            <!-- Search Summary -->
            <div class="alert-summary mb-6">
              <h3 class="text-h6 mb-3">Alert Details</h3>
              <v-card variant="outlined" class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-icon class="mr-2" color="primary">mdi-brain</v-icon>
                  <strong>Search Query:</strong>
                </div>
                <div class="ml-6 mb-3">"{{ searchQuery }}"</div>
                
                <div class="d-flex align-center mb-2">
                  <v-icon class="mr-2" color="info">mdi-map-marker</v-icon>
                  <strong>City:</strong>
                </div>
                <div class="ml-6 mb-3">{{ selectedCity || 'All cities' }}</div>
                
                <div class="d-flex align-center mb-2">
                  <v-icon class="mr-2" color="success">mdi-home-search</v-icon>
                  <strong>Current Results:</strong>
                </div>
                <div class="ml-6">{{ totalProperties }} properties found</div>
              </v-card>
            </div>

            <!-- Frequency Selection -->
            <div class="frequency-selection mb-6">
              <h3 class="text-h6 mb-3">How often should we check for new properties?</h3>
              <v-select density="compact"
                v-model="alertFrequency"
                :items="frequencyOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                label="Alert Frequency"
                :rules="[v => !!v || 'Please select a frequency']"
              />
            </div>

            <!-- Privacy Agreement -->
            <div class="privacy-agreement mb-6">
              <v-card variant="outlined" color="warning">
                <v-card-text>
                  <div class="d-flex align-center mb-3">
                    <v-icon class="mr-2" color="warning">mdi-shield-account</v-icon>
                    <strong>Marketing Consent & Privacy Agreement</strong>
                  </div>
                  
                  <div class="privacy-text mb-4">
                    <p class="text-body-2 mb-2">
                      By creating this property alert, you agree that your email and other information 
                      shared shall be used for marketing purposes, specifically to find you appropriate 
                      properties that match your search criteria.
                    </p>
                    <p class="text-body-2 mb-2">
                      <strong>What we'll send you:</strong>
                    </p>
                    <ul class="text-body-2 ml-4">
                      <li>New property listings matching your search criteria</li>
                      <li>Property market updates for your selected city</li>
                      <li>Relevant real estate insights and tips</li>
                    </ul>
                    <p class="text-body-2 mt-2">
                      <strong>Your privacy:</strong> You can unsubscribe at any time. This consent will be recorded in your profile.
                    </p>
                  </div>
                  
                  <v-checkbox
                    v-model="marketingConsent"
                    color="primary"
                    :rules="[v => !!v || 'You must agree to receive marketing communications']"
                  >
                    <template v-slot:label>
                      <div class="text-body-2">
                        <strong>I agree</strong> to receive property alerts and marketing communications 
                        via email based on my search criteria.
                      </div>
                    </template>
                  </v-checkbox>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeAlertDialog">
            Cancel
          </v-btn>
          <v-btn
            v-if="isAuthenticated"
            color="success"
            :loading="creatingAlert"
            :disabled="!alertFrequency || !marketingConsent"
            @click="createPropertyAlert"
          >
            <v-icon start>mdi-bell-plus</v-icon>
            Create Alert
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reusable Alert Dialog -->
    <AlertDialog
      v-model="showDialog"
      :type="alertType"
      :title="alertTitle"
      :message="alertMessage"
      :confirm-text="alertConfirmText"
      @confirm="closeAlert"
    />
    </FeatureGate>
  </div>
</template>

<script setup lang="ts">
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])
const errorMessage = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const totalProperties = ref(0)
const itemsPerPage = 9

// City detection and selection
const selectedCity = ref<string>('')
const selectedNeighborhoodName = ref<string | null>(null)
const cities = ref<any[]>([])
const loadingCities = ref(false)
const userLocation = ref<{lat: number, lng: number} | null>(null)

// Speech Recognition
const isListening = ref(false)
const speechRecognition = ref<any>(null)
const speechSupported = ref(false)

// Property alerts
const showAlertDialog = ref(false)
const creatingAlert = ref(false)
const alertFrequency = ref('')
const marketingConsent = ref(false)

// Authentication
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

// Alert system
const { showDialog, alertType, alertTitle, alertMessage, alertConfirmText, showSuccess, showError, closeAlert } = useAlert()

// Step-by-step guide animation
const step1Text = ref('')
const step2Text = ref('')
const step3Text = ref('')
const step4Text = ref('')
const step5Text = ref('')

const step1Completed = ref(false)
const step2Completed = ref(false)
const step3Completed = ref(false)
const step4Completed = ref(false)
const step5Completed = ref(false)

const stepTexts: string[] = [
  "Describe exactly what you want, from the vibes to the specific architectural styles.",
  "Our AI parses your input to find matches that go beyond simple database filters.",
  "Real-time property data is cross-referenced with your lifestyle requirements.",
  "Browse through results and use pagination to see more properties.",
  "Create alerts to get notified when new properties match your criteria."
]

const exampleQueries = [
  "4 bedroom house with finished basement and garage",
  "Luxury condo downtown with parking and pool",
  "Modern townhouse under 500k with garage",
  "Waterfront property with 3+ bedrooms",
  
 
]

const frequencyOptions = [
  { label: 'Every 2 Hours', value: '2h', description: 'Get notified quickly of new listings' },
  { label: 'Every 4 Hours', value: '4h', description: 'Regular updates throughout the day' },
  { label: 'Every 12 Hours', value: '12h', description: 'Twice daily updates' },
  { label: 'Daily', value: '24h', description: 'Once per day (recommended)' },
  { label: 'Weekly', value: '7d', description: 'Weekly summary of new properties' },
  { label: 'Bi-Weekly', value: '14d', description: 'Every two weeks' },
  { label: 'Monthly', value: '30d', description: 'Monthly property updates' }
]

// Store the last search filters for pagination
const lastSearchFilters = ref<any>(null)

const searchWithAI = async (pageNum = 1) => {
  // Ensure pageNum is a number
  const page = typeof pageNum === 'number' ? pageNum : 1
  
  searching.value = true
  errorMessage.value = ''
  if (page === 1) {
    searchResults.value = []
    currentPage.value = 1
  }
  
  try {
    let parseResult
    
    // For pagination (page > 1), reuse the last search filters
    if (page > 1 && lastSearchFilters.value) {
      parseResult = lastSearchFilters.value
    } else {
      // Step 1: Parse the natural language query (only for new searches)
      parseResult = await $fetch('/api/ai/parse-property-query', {
        method: 'POST',
        body: { query: searchQuery.value }
      })
      
      // Store filters for pagination
      lastSearchFilters.value = parseResult
    }
    
    // AI parsing completed
    
    // Step 2: Convert extracted filters to API query parameters
    const queryParams = new URLSearchParams()
    Object.entries(parseResult.filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Handle mappings for the enhanced API
        if (key === 'beds') {
          // Check if original query indicates minimum (3+, "or more", etc.)
          const query = searchQuery.value.toLowerCase()
          const isMinimum = query.includes('+') || 
                           query.includes('or more') ||
                           query.includes('plus') ||
                           query.includes('minimum') ||
                           query.includes('at least')
          
          const isExact = query.includes('exactly') || 
                         query.includes('precise') ||
                         query.includes('specific')
          
          if (isExact) {
            // Explicitly requested exact match
            queryParams.append('bedsExact', String(value))
          } else if (isMinimum) {
            // Use minimum bedrooms (3+ bedrooms = 3 or more)
            queryParams.append('beds', String(value))
          } else {
            // Default: for most searches like "4 bedroom house", use exact match
            // This matches user expectations better
            queryParams.append('bedsExact', String(value))
          }
        } else if (key === 'garageSpaces') {
          // Map garageSpaces to garage feature
          queryParams.append('features', 'garage')
        } else if (key === 'basement') {
          // Map basement to basement feature
          queryParams.append('features', 'basement')
        } else if (key === 'garage' && value === true) {
          // Map garage boolean to garage feature
          queryParams.append('features', 'garage')
        } else if (key === 'features' && typeof value === 'object') {
          // Handle features object - ADD ALL FEATURES for comprehensive search
          // Group features by category for better logging
          const allFeatures: string[] = []
          
          // Add all detected features to the search
          Object.entries(value).forEach(([feature, isEnabled]) => {
            if (isEnabled) {
              queryParams.append('features', feature)
              allFeatures.push(feature)
            }
          })
          
          console.log('🎯 All features for search:', allFeatures)
        // ========== ENHANCED RESIDENTIAL FIELD MAPPINGS ==========
        
        // Price filters
        } else if (key === 'minPrice') {
          queryParams.append('minPrice', String(value))
        } else if (key === 'maxPrice') {
          queryParams.append('maxPrice', String(value))
          
        // Square footage
        } else if (key === 'minSqft') {
          queryParams.append('minSqft', String(value))
        } else if (key === 'maxSqft') {
          queryParams.append('maxSqft', String(value))
          
        // Lot size
        } else if (key === 'lotSizeAcres' || key === 'minLotSizeAcres') {
          queryParams.append('lotSizeAcres', String(value))
        } else if (key === 'maxLotSizeAcres') {
          queryParams.append('maxLotSizeAcres', String(value))
        } else if (key === 'lotSizeSqFt') {
          queryParams.append('lotSizeSqFt', String(value))
          
        // Building characteristics
        } else if (key === 'stories') {
          queryParams.append('stories', String(value))
        } else if (key === 'minYearBuilt') {
          queryParams.append('minYearBuilt', String(value))
        } else if (key === 'maxYearBuilt') {
          queryParams.append('maxYearBuilt', String(value))
        } else if (key === 'condition') {
          queryParams.append('condition', String(value))
          
        // Zoning and location
        } else if (key === 'zoning') {
          queryParams.append('zoning', String(value))
        } else if (key === 'location' || key === 'locationType') {
          // Don't override city dropdown selection
          if (!selectedCity.value) {
            queryParams.append('location', String(value))
          }
        } else if (key === 'subdivision') {
          queryParams.append('subdivision', String(value))
          
        // HOA/Condo fees
        } else if (key === 'maxHoaFee') {
          queryParams.append('maxHoaFee', String(value))
        } else if (key === 'noHoaFee') {
          if (value) queryParams.append('noHoaFee', 'true')
          
        // Tax amount
        } else if (key === 'maxTaxAmount') {
          queryParams.append('maxTaxAmount', String(value))
          
        // Bathrooms
        } else if (key === 'baths') {
          queryParams.append('baths', String(value))
          
        // Proximity/near
        } else if (key === 'near') {
          // Store for potential future use (would need POI integration)
          console.log('📍 Proximity filter detected:', value)
          
        // Multi-level property types as features
        } else if (key === 'multiLevel' || key === 'splitLevel') {
          queryParams.append('features', key)
        } else if (key === 'largeLot' || key === 'smallLot') {
          queryParams.append('features', key)
          
        // Skip internal flags
        } else if (key === 'bedsMinimum') {
          // This is handled by beds logic above
        } else if (key === 'mainFloorBedrooms' || key === 'upperFloorBedroomCount') {
          // Informational counts used for remark keyword generation
          
        // Arrays (like 'near' items and remarkKeywords)
        } else if (Array.isArray(value)) {
          queryParams.append(key, value.join(','))
          
        // Catch-all for any other filters
        } else {
          queryParams.append(key, String(value))
        }
      }
    })
    
    // Add city filter if selected
    if (selectedCity.value) {
      queryParams.append('city', selectedCity.value)
    }
    
    // Add neighborhood/subdivision filter if selected
    if (selectedNeighborhoodName.value) {
      queryParams.append('subdivision', selectedNeighborhoodName.value)
    }
    
    // Add pagination parameters
    queryParams.append('limit', itemsPerPage.toString())
    queryParams.append('page', page.toString())
    
    // API query prepared
    
    // Step 3: Search properties using existing API
    const response = await $fetch(`/api/properties?${queryParams.toString()}`)
    
    if (response && response.properties && Array.isArray(response.properties)) {
      searchResults.value = response.properties
      
      // Extract pagination data
      if (response.pagination) {
        totalProperties.value = response.pagination.total
        totalPages.value = response.pagination.totalPages
        currentPage.value = response.pagination.page
      } else {
        // This should never happen - pagination should always be present
        console.error('❌ No pagination data in response!')
        totalProperties.value = response.properties.length
        totalPages.value = 1
        currentPage.value = 1
      }
      
      // Search completed successfully
      console.log('✅ Search completed:', searchResults.value.length, 'properties on page', currentPage.value, 'of', totalPages.value)
      
      // Show a helpful message if no results
      if (totalProperties.value === 0) {
        console.log('⚠️ No properties found with current filters. Consider removing some filters.')
      }
    } else {
      console.error('❌ API returned unexpected format:', response)
      searchResults.value = []
      totalProperties.value = 0
      totalPages.value = 0
      currentPage.value = 1
    }
    
  } catch (error: any) {
    console.error('❌ AI Search failed:', error)
    errorMessage.value = error.data?.statusMessage || 'Search failed. Please try again.'
    searchResults.value = []
    totalProperties.value = 0
    totalPages.value = 0
  } finally {
    searching.value = false
  }
}

const handlePageChange = (page: any) => {
  console.log('🔄 Pagination clicked, raw value:', page, typeof page)
  const pageNumber = Number(page)
  console.log('🔄 Converted to number:', pageNumber)
  goToPage(pageNumber)
}

const goToPage = (page: number) => {
  console.log('📄 goToPage called with:', page, 'current:', currentPage.value, 'total:', totalPages.value)
  
  // Ensure page is a valid number
  if (!page || isNaN(page) || page < 1 || page > totalPages.value) {
    console.log('❌ Invalid page number:', page)
    return
  }
  
  // Remove the "already on page" check since v-model updates currentPage before this function runs
  console.log('✅ Loading page:', page)
  searchWithAI(page)
}

// Load cities and detect user location
const loadCities = async () => {
  loadingCities.value = true
  try {
    const citiesData = await $fetch('/api/properties/cities')
    cities.value = citiesData || []
    console.log('🏙️ Loaded', cities.value.length, 'cities')
  } catch (error) {
    console.error('❌ Failed to load cities:', error)
  } finally {
    loadingCities.value = false
  }
}

// Detect user's current city using multi-layer approach:
// 1. Browser geolocation → server reverse geocode
// 2. Server IP-based geolocation
// 3. Haversine distance fallback
// 4. Default to top city by property count
const detectUserLocation = async () => {
  // Layer 1: Try browser geolocation
  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000, maximumAge: 300000, enableHighAccuracy: false
        })
      })
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      // Server-side reverse geocode for accurate city name
      const detected = await serverDetectCity(position.coords.latitude, position.coords.longitude)
      if (detected) return
      // Fallback to Haversine
      findNearestCity()
      return
    } catch {
      console.log('Browser geolocation unavailable, trying IP-based...')
    }
  }

  // Layer 2: Server-side IP geolocation
  const detected = await serverDetectCity()
  if (detected) return

  // Layer 3: Default to top city
  fallbackToDefaultCity()
}

const serverDetectCity = async (lat?: number, lng?: number): Promise<boolean> => {
  try {
    const params = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ''
    const res = await fetch(`/api/detect-location${params}`)
    if (!res.ok) return false
    const data = await res.json()
    if (!data.city) return false

    const matched = cities.value.find(
      c => c.name.toLowerCase() === data.city.toLowerCase()
    ) || cities.value.find(
      c => c.name.toLowerCase().includes(data.city.toLowerCase()) ||
           data.city.toLowerCase().includes(c.name.toLowerCase())
    )
    if (matched) {
      selectedCity.value = matched.name
      if (data.latitude && data.longitude) {
        userLocation.value = { lat: data.latitude, lng: data.longitude }
      }
      console.log('📍 Server detected city:', matched.name)
      return true
    }
    if (data.latitude && data.longitude) {
      userLocation.value = { lat: data.latitude, lng: data.longitude }
      findNearestCity()
      return selectedCity.value !== ''
    }
  } catch (e) {
    console.warn('Server location detection failed:', e)
  }
  return false
}

const fallbackToDefaultCity = () => {
  if (cities.value.length > 0) {
    const sorted = [...cities.value].sort((a, b) => (b.count || 0) - (a.count || 0))
    selectedCity.value = sorted[0]?.name || 'Edmonton'
    console.log('📍 Defaulting to city with most properties:', selectedCity.value)
  } else {
    selectedCity.value = 'Edmonton'
  }
}

const findNearestCity = () => {
  if (!userLocation.value || cities.value.length === 0) {
    fallbackToDefaultCity()
    return
  }

  let nearestCity = cities.value[0]
  let minDistance = Infinity
  let foundWithCoords = false

  cities.value.forEach(city => {
    if (city.coordinates?.latitude && city.coordinates?.longitude) {
      const dLat = (city.coordinates.latitude - userLocation.value!.lat) * Math.PI / 180
      const dLng = (city.coordinates.longitude - userLocation.value!.lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(userLocation.value!.lat * Math.PI / 180) *
                Math.cos(city.coordinates.latitude * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2
      const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (distance < minDistance) {
        minDistance = distance
        nearestCity = city
        foundWithCoords = true
      }
    }
  })

  if (!foundWithCoords) {
    fallbackToDefaultCity()
    return
  }

  selectedCity.value = nearestCity.name
  console.log('🎯 Auto-selected nearest city:', nearestCity.name)
}

// Neighborhood selection handler
const onNeighborhoodSelected = (neighborhood: any) => {
  if (neighborhood) {
    selectedNeighborhoodName.value = neighborhood.name
    console.log('🏘️ Neighborhood selected:', neighborhood.name)
  } else {
    selectedNeighborhoodName.value = null
  }
}

// Speech Recognition Functions
//
// Pause tolerance design
// ──────────────────────
// The Web Speech API by default ends a session as soon as the engine
// produces a final result, which means a single thoughtful pause mid-query
// terminates the recognition and the user has to click the mic again. To
// support natural, paused speech ("3 bedrooms… in Edmonton… under 600k") we:
//
//   1. Set `continuous = true` so the engine keeps the session open across
//      multiple utterances instead of bailing on the first final.
//   2. Accumulate finalized transcripts in a closure-level buffer
//      (`finalBuffer`) and render `finalBuffer + currentInterim` into the
//      input. This fixes the previous bug where each new final result
//      overwrote everything that came before it.
//   3. Auto-restart on `onend` if the user hasn't manually stopped — Chrome's
//      STT engine still auto-ends on long silences even with continuous=true,
//      so we transparently re-open the session. Restart attempts are
//      throttled and capped so a broken engine can't loop forever.
//   4. Track a 10-second silence timer that resets every time we get fresh
//      audio. If silence exceeds the window we end the session cleanly so
//      the input doesn't hang open indefinitely.
//   5. Suppress the "no-speech" toast when we already captured something —
//      that error is harmless when it just means the user paused too long
//      for the engine, and we have a transcript to keep.
const SILENCE_TIMEOUT_MS = 10_000
const MAX_RESTART_ATTEMPTS = 5

// All browsers on iOS — Safari, Chrome, Edge, Firefox — are forced by Apple
// to use WebKit under the hood, so we detect the OS rather than the browser.
// iOS WebKit exposes webkitSpeechRecognition but ignores `continuous: true`
// and ends sessions aggressively after each utterance. The auto-restart
// logic in onend papers over this so pause tolerance still works on iPhone
// and iPad — it just means each pause triggers a real session restart
// instead of a single long-lived session like on Android/desktop Chrome.
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // Modern iPads report "MacIntel" + touch; the touch check disambiguates.
  return /iPad|iPhone|iPod/.test(ua)
      || (ua.includes('Mac') && typeof (navigator as any).maxTouchPoints === 'number' && (navigator as any).maxTouchPoints > 1)
}

const createSpeechRecognition = () => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition()
  // iOS WebKit ignores `true` and ends after each utterance regardless, so
  // explicitly set false there to avoid relying on undefined behaviour. The
  // auto-restart logic in onend provides equivalent pause tolerance.
  recognition.continuous = !isIOS()
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  // Closure-level state for one recognition instance.
  let finalBuffer = ''         // accumulated finalized text across pauses
  let isManualStop = false     // set true when the user clicks the mic to stop
  let restartAttempts = 0      // back-off counter for transparent restarts
  let silenceTimer: ReturnType<typeof setTimeout> | null = null

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
  }

  const armSilenceTimer = () => {
    clearSilenceTimer()
    silenceTimer = setTimeout(() => {
      isManualStop = true // mark as intentional so onend doesn't auto-restart
      try { recognition.stop() } catch {}
    }, SILENCE_TIMEOUT_MS)
  }

  // Expose flags so toggleSpeechRecognition() can mark a manual stop.
  ;(recognition as any).__markManualStop = () => {
    isManualStop = true
    clearSilenceTimer()
  }

  recognition.onresult = (event: any) => {
    let interimTranscript = ''
    let newFinalThisEvent = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        newFinalThisEvent += transcript
      } else {
        interimTranscript += transcript
      }
    }

    if (newFinalThisEvent) {
      // Append with a space if buffer already has content; trim doubles.
      finalBuffer = (finalBuffer + ' ' + newFinalThisEvent).replace(/\s+/g, ' ').trim()
    }

    // Always render buffer + current interim so the user sees their full
    // utterance plus the live partial mid-sentence.
    const composed = (finalBuffer + ' ' + interimTranscript).replace(/\s+/g, ' ').trim()
    if (composed) searchQuery.value = composed

    // Any audio activity resets the silence countdown.
    armSilenceTimer()

    // Successful results reset restart back-off.
    restartAttempts = 0
  }

  recognition.onend = () => {
    clearSilenceTimer()

    // If the user clicked the mic (or the silence timer fired) we honour the
    // stop and surface "not listening". Otherwise the engine timed out on its
    // own — re-open the session transparently so the pause doesn't end input.
    if (isManualStop) {
      isListening.value = false
      return
    }

    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      // Engine keeps dying — give up and surface the state so the user can retry.
      isListening.value = false
      return
    }

    restartAttempts++
    try {
      recognition.start()
    } catch {
      // start() can throw "InvalidStateError" if a previous session is still
      // tearing down. Schedule a single delayed retry; if that fails too,
      // mark the session as ended.
      setTimeout(() => {
        try { recognition.start() } catch { isListening.value = false }
      }, 250)
    }
  }

  recognition.onerror = (event: any) => {
    console.error('🎤 Speech recognition error:', event.error)

    // `aborted` is fired on every manual stop — never an error to the user.
    // `no-speech` happens when the user pauses too long for the engine; if
    // we already captured something, keep it and let onend auto-restart.
    if (event.error === 'aborted') return
    if (event.error === 'no-speech') {
      // Don't flip isListening — onend will handle restart unless manually stopped.
      return
    }

    // Real errors: clear silence timer, end session, surface a toast.
    clearSilenceTimer()
    isManualStop = true
    isListening.value = false

    let errorMsg = 'Voice recognition failed. '
    switch (event.error) {
      case 'audio-capture':
        errorMsg += 'No microphone found. Please check your device settings.'
        break
      case 'not-allowed':
        errorMsg += 'Microphone permission denied. Please allow microphone access in your browser settings.'
        break
      case 'network':
        errorMsg += 'Network error. Voice requires an internet connection.'
        break
      case 'service-not-allowed':
        errorMsg += 'Voice service not available on this device.'
        break
      default:
        errorMsg += 'Please try again.'
    }

    errorMessage.value = errorMsg
    setTimeout(() => {
      if (errorMessage.value === errorMsg) errorMessage.value = ''
    }, 6000)
  }

  recognition.onstart = () => {
    isListening.value = true
    errorMessage.value = ''
    // Fresh session — reset accumulated state on the FIRST start only.
    // (Restarts triggered by onend keep finalBuffer so the user's partial
    // utterance survives an engine timeout.)
    if (restartAttempts === 0 && !finalBuffer) {
      isManualStop = false
    }
    armSilenceTimer()
  }

  return recognition
}

const initSpeechRecognition = () => {
  if (typeof window === 'undefined') return

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    speechSupported.value = false
    return
  }

  speechSupported.value = true
  speechRecognition.value = createSpeechRecognition()
}

const toggleSpeechRecognition = async () => {
  if (!speechSupported.value) {
    errorMessage.value = 'Voice input isn\'t available in this browser. Try Safari on iPhone/iPad, Chrome on Android, or Chrome/Edge/Safari on desktop.'
    setTimeout(() => { errorMessage.value = '' }, 6000)
    return
  }

  if (isListening.value) {
    // Flag this as an intentional stop so onend's auto-restart logic stays
    // out of the way. Without this flag a manual click would silently
    // re-open the session because of pause-tolerant continuous listening.
    try { (speechRecognition.value as any)?.__markManualStop?.() } catch {}
    speechRecognition.value?.stop()
    isListening.value = false
    return
  }

  // Re-create the recognition instance each time on mobile to avoid stale state
  speechRecognition.value = createSpeechRecognition()

  try {
    // On mobile, request microphone permission explicitly first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
    }
    speechRecognition.value?.start()
  } catch (err: any) {
    console.error('🎤 Failed to start speech recognition:', err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage.value = 'Microphone access denied. Please allow microphone permission in your browser settings and try again.'
    } else {
      errorMessage.value = 'Voice input failed to start. Please try again.'
    }
    setTimeout(() => { errorMessage.value = '' }, 6000)
  }
}

// Alert dialog functions
const openAlertDialog = () => {
  if (!isAuthenticated.value) {
    showAlertDialog.value = true
    return
  }
  
  // Reset form
  alertFrequency.value = ''
  marketingConsent.value = false
  showAlertDialog.value = true
}

const closeAlertDialog = () => {
  showAlertDialog.value = false
  alertFrequency.value = ''
  marketingConsent.value = false
}

const goToLogin = () => {
  closeAlertDialog()
  navigateTo('/auth/login?redirect=/ai-search')
}

const createPropertyAlert = async () => {
  creatingAlert.value = true
  
  try {
    const alertData = {
      naturalQuery: searchQuery.value,
      parsedFilters: lastSearchFilters.value?.filters || {},
      city: selectedCity.value,
      frequency: alertFrequency.value,
      marketingConsent: marketingConsent.value,
      emailEnabled: true
    }
    
    const response = await $fetch('/api/buyer/alerts', {
      method: 'POST',
      body: alertData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    console.log('✅ Property alert created:', response)
    
    // Show success message
    showSuccess(
      `You'll receive notifications ${frequencyOptions.find(f => f.value === alertFrequency.value)?.label.toLowerCase()} when new properties match your search.`,
      'Property Alert Created!'
    )
    
    closeAlertDialog()
    
  } catch (error: any) {
    console.error('❌ Failed to create alert:', error)
    showError(error.data?.statusMessage || error.message, 'Failed to Create Alert')
  } finally {
    creatingAlert.value = false
  }
}

// Typewriter animation function
const typewriterEffect = async (text: string, targetRef: any, delay = 50) => {
  targetRef.value = ''
  
  for (let i = 0; i < text.length; i++) {
    targetRef.value += text.charAt(i)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

// Start the step-by-step animation
const startStepAnimation = async () => {
  // Small delay before starting
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Step 1
  await typewriterEffect(stepTexts[0] || '', step1Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step1Completed.value = true
  
  // Step 2
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[1] || '', step2Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step2Completed.value = true
  
  // Step 3
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[2] || '', step3Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step3Completed.value = true
  
  // Step 4
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[3] || '', step4Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step4Completed.value = true
  
  // Step 5
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[4] || '', step5Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step5Completed.value = true
}

// Initialize on mount
onMounted(async () => {
  await loadCities()
  detectUserLocation()
  
  // Initialize speech recognition
  initSpeechRecognition()
  
  // Start the step animation
  startStepAnimation()
})


// SEO
useSeoMeta({
  title: 'AI Property Search - Find Your Dream Home with Natural Language',
  description: 'Use AI to search for properties with natural language. Describe your dream home and let our intelligent search find perfect matches.',
  ogTitle: 'AI Property Search - Find Your Dream Home with Natural Language',
  ogDescription: 'Use AI to search for properties with natural language. Describe your dream home and let our intelligent search find perfect matches.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'AI Property Search',
  twitterDescription: 'Describe your dream home in natural language and let AI find perfect matches.',
  robots: 'index, follow',
})
</script>

<style scoped>
.ai-search-page {
  background-color: #fcfcfc;
  min-height: 100vh;
}

/* HERO */
.hero-section {
  background: #000;
  min-height: 440px;
}

.hero-blur-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 80% 20%, rgba(25, 118, 210, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(25, 118, 210, 0.15) 0%, transparent 50%);
  filter: blur(80px);
}

.premium-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.gradient-text {
  background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.3) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ai-chip {
  width: fit-content;
  padding: 8px 20px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.2em;
}

/* SEARCH CARD */
.premium-search-card {
  background: #fff !important;
  border-radius: 32px !important;
  box-shadow: 0 40px 100px rgba(0,0,0,0.08) !important;
  border: 1px solid #f0f0f0 !important;
}

.premium-select :deep(.v-field) {
  border-radius: 14px !important;
  background-color: #f8f9fa !important;
}

.premium-textarea :deep(.v-field) {
  border-radius: 20px !important;
  padding: 16px !important;
  background-color: #fcfcfc !important;
  border-color: #eee !important;
}

.example-chip {
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px !important;
}

.example-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background: #f5f5f5;
}

.search-btn-premium {
  border-radius: 16px !important;
  text-transform: none !important;
  font-weight: 800 !important;
  font-size: 1.05rem !important;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
}

.search-btn-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.2) !important;
}

.search-loader {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  backdrop-filter: blur(10px);
}

/* SIDEBAR */
.sticky-sidebar {
  position: sticky;
  top: 100px;
}

.sidebar-guide-premium {
  background: #fff;
  border-radius: 24px !important;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #f8f9fa;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.step-item:hover .step-circle {
  background: #000;
  color: #fff;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: #FF9800;
}

.empty-state-border {
  border: 2px dashed #e0e0e0;
}

.tracking-widest { letter-spacing: 0.15em; }
.leading-relaxed { line-height: 1.7; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.relative { position: relative; }
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }

/* Typewriter Animation */
.typewriter-text {
  line-height: 1.6;
  position: relative;
}

.typewriter-text::after {
  content: '|';
  animation: blink 1s infinite;
  color: #000;
  margin-left: 2px;
}

.text-success.typewriter-text::after {
  display: none;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Voice Recognition Animations */
.listening-animation {
  animation: pulse 1.5s ease-in-out infinite;
}

.pulse-icon {
  animation: pulse-scale 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
  }
}

@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.voice-trigger {
  transition: all 0.3s ease;
}

/* Mobile responsiveness */
@media (max-width: 960px) {
  .sticky-sidebar {
    position: relative;
    top: 0;
  }

  .premium-title {
    font-size: 2rem;
  }

  .premium-search-card {
    border-radius: 24px !important;
  }

  .search-btn-premium {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .hero-section {
    padding: 48px 0;
  }

  .premium-title {
    font-size: 1.75rem;
  }

  .input-footer {
    flex-direction: column;
    align-items: stretch !important;
  }

  .search-btn-premium {
    margin-top: 12px;
  }
}
</style>

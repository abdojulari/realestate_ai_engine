<template>
  <div class="ai-search-page">
    <!-- Hero Section -->
    <section class="hero-section text-white py-16">
      <v-container>
        <v-row align="center" justify="center" class="text-center">
          <v-col cols="12" md="8">
            <v-icon size="64" class="mb-4">mdi-brain</v-icon>
            <h1 class="text-h3 mb-4">AI-Powered Property Search</h1>
            <p class="text-h6 mb-0">Describe your dream home in plain English and let AI find it for you</p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Search Section -->
    <section class="search-section py-12">
      <v-container>
        <v-row >
          <v-col cols="12" md="8">
            <v-card flat>
              <v-card-text class="pa-8">
                <!-- City Selection -->
                <div class="mb-4">
                  <v-select
                    v-model="selectedCity"
                    :items="cities"
                    item-title="name"
                    item-value="name"
                    label="Search in City"
                    variant="outlined"
                    prepend-inner-icon="mdi-map-marker"
                    :loading="loadingCities"
                    clearable
                  >
                    <template v-slot:selection="{ item }">
                      <span>{{ item.raw.name }} ({{ item.raw.count }} properties)</span>
                    </template>
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props" :title="`${item.raw.name} (${item.raw.count} properties)`" />
                    </template>
                  </v-select>
                </div>

                <!-- Natural Language Input -->
                <div class="mb-6">
                  <h2 class="text-h5 mb-4">Tell us what you're looking for</h2>
                  <v-textarea
                    v-model="searchQuery"
                    label="Describe your ideal property..."
                    placeholder="Example: I want a 4 bedroom house with finished basement and double garage near schools"
                    rows="4"
                    variant="outlined"
                    class="search-input"
                    :loading="searching"
                  />
                  
                  <!-- Example Queries -->
                  <div class="example-queries mt-4">
                    <p class="text-subtitle-2 mb-2">Try these examples:</p>
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
                </div>

                <!-- Search Button -->
                <div class="text-center mb-6">
                  <v-btn
                    color="primary"
                    size="large"
                    :loading="searching"
                    :disabled="!searchQuery.trim()"
                    @click="searchWithAI"
                    class="search-btn"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon start>mdi-magnify</v-icon>
                    Search Properties
                  </v-btn>
                  
                  <!-- Alert Scheduling Button -->
                  <v-btn
                    v-if="searchResults.length > 0"
                    color="success"
                    size="large"
                    variant="outlined"
                    class="ml-4"
                    @click="openAlertDialog"
                  >
                    <v-icon start>mdi-bell-plus</v-icon>
                    Get Alerts
                  </v-btn>
                </div>

                <!-- Error Display -->
                <v-alert
                  v-if="errorMessage"
                  type="error"
                  variant="tonal"
                  class="mb-4"
                  closable
                  @click:close="errorMessage = ''"
                >
                  {{ errorMessage }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
           <v-col cols="12" md="4">
             <v-card class="guide-card" flat>
               <v-card-text class="pa-6">
                 <h3 class="text-h6 mb-4 d-flex align-center">
                   <v-icon class="mr-2" color="primary">mdi-lightbulb-outline</v-icon>
                   How to use AI-Powered Search
                 </h3>
                 
                 <div class="steps-container">
                   <!-- Step 1 -->
                   <div class="step-item d-flex align-start">
                     <div class="step-icon mr-3">
                       <v-icon 
                         v-if="step1Completed"
                         color="success" 
                         size="20"
                       >
                         mdi-check-circle
                       </v-icon>
                       <div v-else class="step-number">1</div>
                     </div>
                     <div class="step-content flex-grow-1">
                       <div 
                         class="typewriter-text"
                         :class="{ 'text-success': step1Completed }"
                       >
                         {{ step1Text }}
                       </div>
                     </div>
                   </div>

                   <!-- Step 2 -->
                   <div v-if="step1Completed || step2Text" class="step-item d-flex align-start">
                     <div class="step-icon mr-3">
                       <v-icon 
                         v-if="step2Completed"
                         color="success" 
                         size="20"
                       >
                         mdi-check-circle
                       </v-icon>
                       <div v-else-if="step2Text" class="step-number">2</div>
                     </div>
                     <div class="step-content flex-grow-1">
                       <div 
                         class="typewriter-text"
                         :class="{ 'text-success': step2Completed }"
                       >
                         {{ step2Text }}
                       </div>
                     </div>
                   </div>

                   <!-- Step 3 -->
                   <div v-if="step2Completed || step3Text" class="step-item d-flex align-start">
                     <div class="step-icon mr-3">
                       <v-icon 
                         v-if="step3Completed"
                         color="success" 
                         size="20"
                       >
                         mdi-check-circle
                       </v-icon>
                       <div v-else-if="step3Text" class="step-number">3</div>
                     </div>
                     <div class="step-content flex-grow-1">
                       <div 
                         class="typewriter-text"
                         :class="{ 'text-success': step3Completed }"
                       >
                         {{ step3Text }}
                       </div>
                     </div>
                   </div>

                   <!-- Step 4 -->
                   <div v-if="step3Completed || step4Text" class="step-item d-flex align-start">
                     <div class="step-icon mr-3">
                       <v-icon 
                         v-if="step4Completed"
                         color="success" 
                         size="20"
                       >
                         mdi-check-circle
                       </v-icon>
                       <div v-else-if="step4Text" class="step-number">4</div>
                     </div>
                     <div class="step-content flex-grow-1">
                       <div 
                         class="typewriter-text"
                         :class="{ 'text-success': step4Completed }"
                       >
                         {{ step4Text }}
                       </div>
                     </div>
                   </div>

                   <!-- Step 5 -->
                   <div v-if="step4Completed || step5Text" class="step-item d-flex align-start">
                     <div class="step-icon mr-3">
                       <v-icon 
                         v-if="step5Completed"
                         color="success" 
                         size="20"
                       >
                         mdi-check-circle
                       </v-icon>
                       <div v-else-if="step5Text" class="step-number">5</div>
                     </div>
                     <div class="step-content flex-grow-1">
                       <div 
                         class="typewriter-text"
                         :class="{ 'text-success': step5Completed }"
                       >
                         {{ step5Text }}
                       </div>
                     </div>
                   </div>
                 </div>
               </v-card-text>
             </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Results Section -->
    <section v-if="searchResults.length > 0" class="results-section py-8">
      <v-container>
        <!-- Results Header -->
        <div class="d-flex align-center mb-6">
          <h2 class="text-h5">Search Results</h2>
          <v-spacer />
          <div class="d-flex align-center ga-2">
            <v-chip v-if="selectedCity" color="info" variant="tonal">
              <v-icon start>mdi-map-marker</v-icon>
              {{ selectedCity }}
            </v-chip>
            <v-chip color="success" variant="tonal">
              {{ totalProperties.toLocaleString() }} matches
            </v-chip>
            <v-chip color="primary" variant="tonal">
              Showing {{ searchResults.length }}
            </v-chip>
          </div>
        </div>
        
        <!-- Properties Grid -->
        <v-row>
          <v-col 
            v-for="property in searchResults" 
            :key="property.id"
            cols="12" 
            md="6" 
            lg="4"
          >
            <PropertyCard :property="property" />
          </v-col>
        </v-row>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1 && totalProperties > itemsPerPage" class="pagination-section mt-8">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="5"
            @update:model-value="handlePageChange"
            class="justify-center"
          />
          
          <!-- Simple Page Info -->
          <div class="text-center mt-4">
            <p class="text-body-2 text-grey-darken-1">
              Page {{ currentPage }} of {{ totalPages }}
            </p>
          </div>
        </div>
      </v-container>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works py-12 bg-grey-lighten-5">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <h2 class="text-h4 text-center mb-8">How AI Search Works</h2>
            <v-row>
              <v-col cols="12" md="4" class="text-center">
                <v-icon size="48" color="primary" class="mb-4">mdi-brain</v-icon>
                <h3 class="text-h6 mb-2">1. AI Understanding</h3>
                <p>Our AI parses your natural language description and extracts key property features</p>
              </v-col>
              <v-col cols="12" md="4" class="text-center">
                <v-icon size="48" color="primary" class="mb-4">mdi-filter-variant</v-icon>
                <h3 class="text-h6 mb-2">2. Smart Filtering</h3>
                <p>Converts your requirements into precise search filters for our property database</p>
              </v-col>
              <v-col cols="12" md="4" class="text-center">
                <v-icon size="48" color="primary" class="mb-4">mdi-home-search</v-icon>
                <h3 class="text-h6 mb-2">3. Perfect Matches</h3>
                <p>Returns properties that match your specific criteria from thousands of listings</p>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </section>

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
              <v-select
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
  </div>
</template>

<script setup lang="ts">
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
const cities = ref<any[]>([])
const loadingCities = ref(false)
const userLocation = ref<{lat: number, lng: number} | null>(null)

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

const stepTexts = [
  "Enter your search prompt in natural language (e.g., '4 bedroom house with garage')",
  "Select your preferred city from the dropdown menu",
  "Click 'Search Properties' to find matching listings",
  "Browse through results and use pagination to see more",
  "Create alerts to get notified when new properties match your criteria"
]

const exampleQueries = [
  "4 bedroom house with finished basement and garage",
  "Luxury condo downtown with parking and pool",
  "Modern townhouse under 500k with garage",
  "Waterfront property with 3+ bedrooms"
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
    console.log('🧠 AI Search starting for:', searchQuery.value, 'Page:', page)
    
    let parseResult
    
    // For pagination (page > 1), reuse the last search filters
    if (page > 1 && lastSearchFilters.value) {
      parseResult = lastSearchFilters.value
      console.log('🔄 Reusing filters for pagination:', parseResult.filters)
    } else {
      // Step 1: Parse the natural language query (only for new searches)
      parseResult = await $fetch('/api/ai/parse-property-query', {
        method: 'POST',
        body: { query: searchQuery.value }
      })
      
      // Store filters for pagination
      lastSearchFilters.value = parseResult
    }
    
    console.log('✅ AI Extracted filters:', parseResult.filters)
    console.log('🎯 Parsing confidence:', parseResult.confidence)
    
    // Step 2: Convert extracted filters to API query parameters
    const queryParams = new URLSearchParams()
    Object.entries(parseResult.filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Handle mappings for the existing API
        if (key === 'beds') {
          // Use exact match for bedrooms, not gte
          queryParams.append('bedsExact', String(value))
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
          // Handle features object
          Object.entries(value).forEach(([featureKey, featureValue]) => {
            if (featureValue) {
              queryParams.append('features', featureKey)
            }
          })
        } else if (Array.isArray(value)) {
          queryParams.append(key, value.join(','))
        } else {
          queryParams.append(key, String(value))
        }
      }
    })
    
    // Add city filter if selected
    if (selectedCity.value) {
      queryParams.append('city', selectedCity.value)
    }
    
    // Add pagination parameters
    queryParams.append('limit', itemsPerPage.toString())
    queryParams.append('page', page.toString())
    
    console.log('🔍 API Query:', queryParams.toString())
    
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
      
      console.log('✅ Found', response.properties.length, 'properties on page', currentPage.value)
      console.log('📊 Total:', totalProperties.value, 'properties across', totalPages.value, 'pages')
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

// Detect user's current city
const detectUserLocation = () => {
  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocation not supported')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      console.log('📍 User location detected:', userLocation.value)
      findNearestCity()
    },
    (error) => {
      console.warn('⚠️ Geolocation failed:', error.message)
      // Default to Edmonton if geolocation fails
      selectedCity.value = 'Edmonton'
    }
  )
}

// Find nearest city based on user location
const findNearestCity = () => {
  if (!userLocation.value || cities.value.length === 0) return
  
  // Simple distance calculation to find nearest city
  let nearestCity = cities.value[0]
  let minDistance = Infinity
  
  cities.value.forEach(city => {
    if (city.coordinates?.latitude && city.coordinates?.longitude) {
      const distance = Math.sqrt(
        Math.pow(city.coordinates.latitude - userLocation.value!.lat, 2) + 
        Math.pow(city.coordinates.longitude - userLocation.value!.lng, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        nearestCity = city
      }
    }
  })
  
  selectedCity.value = nearestCity.name
  console.log('🎯 Auto-selected nearest city:', nearestCity.name)
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
  await typewriterEffect(stepTexts[0], step1Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step1Completed.value = true
  
  // Step 2
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[1], step2Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step2Completed.value = true
  
  // Step 3
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[2], step3Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step3Completed.value = true
  
  // Step 4
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[3], step4Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step4Completed.value = true
  
  // Step 5
  await new Promise(resolve => setTimeout(resolve, 800))
  await typewriterEffect(stepTexts[4], step5Text, 30)
  await new Promise(resolve => setTimeout(resolve, 500))
  step5Completed.value = true
}

// Initialize on mount
onMounted(async () => {
  await loadCities()
  detectUserLocation()
  
  // Start the step animation
  startStepAnimation()
})


// SEO
useHead({
  title: 'AI Property Search - Find Your Dream Home with Natural Language',
  meta: [
    { name: 'description', content: 'Use AI to search for properties with natural language. Describe your dream home and let our intelligent search find perfect matches.' }
  ]
})
</script>

<style scoped>
.ai-search-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.hero-section {
  background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), 
              url('https://imageio.forbes.com/specials-images/imageserve/666fde4152910f2a6c6be2f0/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.search-input :deep(.v-field) {
  border-radius: 12px;
  font-size: 1.1rem;
}

.example-chip {
  cursor: pointer;
  transition: all 0.2s;
}

.example-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.extracted-filters {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e3f2fd;
}

.filters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-btn {
  border-radius: 12px !important;
  font-weight: 600 !important;
  text-transform: none !important;
}

.how-it-works {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.pagination-section {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Animated Guide Styles */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-item {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.step-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-width: 24px;
  margin-top: 2px; /* Align with first line of text */
}

.step-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1976d2;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}

.step-content {
  flex: 1;
}

.typewriter-text {
  font-size: 14px;
  line-height: 1.5;
  position: relative;
}

.typewriter-text::after {
  content: '|';
  animation: blink 1s infinite;
  color: #1976d2;
}

.text-success.typewriter-text::after {
  display: none;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .hero-section {
    padding: 40px 0;
  }
  
  .search-card {
    margin: 0 16px;
  }
  
  .filters-grid {
    justify-content: center;
  }
}
</style>

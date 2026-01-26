<template>
  <v-container fluid class="featured-deals bg-white">
    <!-- Location Badge -->
    <div v-if="userCity" class="location-badge mb-4">
      <v-chip color="primary" variant="tonal" size="small">
        <v-icon start size="small">mdi-map-marker</v-icon>
        Homes near {{ userCity }}
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Carousel -->
    <div v-else-if="displayProperties.length > 0" class="modern-carousel bg-white">
      <div class="carousel-container bg-white">
        <v-btn
          icon="mdi-chevron-left"
          class="carousel-nav-btn carousel-nav-left"
          variant="flat"
          color="white"
          @click="prev"
        />
        
        <div class="viewport">
          <div class="track transition-fast" :style="trackStyle">
            <v-row v-for="(chunk, idx) in chunks" :key="idx" class="slide" no-gutters>
              <v-col
                v-for="property in chunk"
                :key="property.id"
                :cols="12 / perSlide"
                class="property-item pa-3"
              >
                <ModernPropertyCard :property="property" @click="$emit('select', property)" />
              </v-col>
            </v-row>
          </div>
        </div>
        
        <v-btn
          icon="mdi-chevron-right"
          class="carousel-nav-btn carousel-nav-right"
          variant="flat"
          color="white"
          @click="next"
        />
      </div>
      
      <!-- Dots indicator -->
      <v-row justify="center" class="carousel-dots">
        <button
          v-for="i in totalSlides"
          :key="i"
          class="dot"
          :class="{ active: i - 1 === currentSlide }"
          @click="go(i - 1)"
        />
      </v-row>
    </div>

    <!-- No Properties -->
    <div v-else class="text-center py-8 text-grey">
      <v-icon size="48" class="mb-2">mdi-home-search</v-icon>
      <p>No properties available in {{ userCity || 'your area' }}</p>
      <v-btn 
        variant="outlined" 
        color="primary" 
        size="small" 
        class="mt-4"
        to="/properties"
      >
        Browse All Properties
      </v-btn>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import ModernPropertyCard from '~/components/common/ModernPropertyCard.vue'
import type { Property } from '~/types'

const props = defineProps<{
  items?: Property[]  // Optional - will fetch if not provided
  city?: string       // Optional - override detected city
}>()

const emit = defineEmits(['select'])

// State
const loading = ref(false)
const fetchedProperties = ref<Property[]>([])
const userCity = ref<string>('')
const userProvince = ref<string>('Alberta')

// Featured homes criteria: Residential properties, $200K - $5M
const FEATURED_CRITERIA = {
  minPrice: 200000,
  maxPrice: 5000000,
  status: 'for_sale',
  limit: 12
}

// Use provided items or fetched properties
const displayProperties = computed(() => {
  if (props.items && props.items.length > 0) {
    // Filter provided items by criteria (residential only)
    return props.items.filter(p => 
      p.price >= FEATURED_CRITERIA.minPrice &&
      p.price <= FEATURED_CRITERIA.maxPrice &&
      ['house', 'condo', 'townhouse', 'multi-family', 'land'].includes(p.type?.toLowerCase() || '')
    ).slice(0, 12)
  }
  return fetchedProperties.value
})

// Detect user location
async function detectLocation() {
  // Try browser geolocation first
  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        })
      })
      
      // Reverse geocode to get city
      const { latitude, longitude } = position.coords
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      )
      const data = await response.json()
      
      if (data.address) {
        userCity.value = data.address.city || data.address.town || data.address.municipality || 'Edmonton'
        userProvince.value = data.address.state || 'Alberta'
        return
      }
    } catch (e) {
      console.log('Geolocation not available, using default')
    }
  }
  
  // Default to Edmonton, Alberta
  userCity.value = props.city || 'Edmonton'
  userProvince.value = 'Alberta'
}

// Fetch featured properties based on location
async function fetchFeaturedProperties() {
  if (props.items && props.items.length > 0) return
  
  loading.value = true
  
  try {
    await detectLocation()
    
    // Fetch properties from user's city ONLY
    const params = new URLSearchParams({
      city: userCity.value,
      minPrice: FEATURED_CRITERIA.minPrice.toString(),
      maxPrice: FEATURED_CRITERIA.maxPrice.toString(),
      status: FEATURED_CRITERIA.status,
      limit: FEATURED_CRITERIA.limit.toString()
    })
    
    console.log('🏠 Fetching featured properties for city:', userCity.value)
    
    const response = await $fetch<any>(`/api/properties?${params}`)
    let properties = Array.isArray(response) ? response : response?.properties || []
    
    console.log(`🏠 Found ${properties.length} properties in ${userCity.value}`)
    
    // If no properties in user's city, try nearby major cities in the same province
    if (properties.length === 0 && userCity.value) {
      const nearbyCities = getNearbyCities(userCity.value, userProvince.value)
      
      for (const nearbyCity of nearbyCities) {
        if (properties.length >= 6) break
        
        const nearbyParams = new URLSearchParams({
          city: nearbyCity,
          minPrice: FEATURED_CRITERIA.minPrice.toString(),
          maxPrice: FEATURED_CRITERIA.maxPrice.toString(),
          status: FEATURED_CRITERIA.status,
          limit: '6'
        })
        
        const nearbyResponse = await $fetch<any>(`/api/properties?${nearbyParams}`)
        const nearbyProperties = Array.isArray(nearbyResponse) ? nearbyResponse : nearbyResponse?.properties || []
        
        if (nearbyProperties.length > 0) {
          console.log(`🏠 Found ${nearbyProperties.length} properties in nearby city: ${nearbyCity}`)
          // Update userCity to reflect where we found properties
          userCity.value = nearbyCity
          properties = nearbyProperties
          break
        }
      }
    }
    
    fetchedProperties.value = properties
    console.log(`🏠 Final featured properties: ${properties.length}`)
  } catch (error) {
    console.error('Failed to fetch featured properties:', error)
    fetchedProperties.value = []
  } finally {
    loading.value = false
  }
}

// Get nearby major cities based on user's location
function getNearbyCities(city: string, province: string): string[] {
  const cityLower = city.toLowerCase()
  
  // Alberta major cities and their neighbors
  const albertaCities: Record<string, string[]> = {
    'edmonton': ['St. Albert', 'Sherwood Park', 'Spruce Grove', 'Leduc', 'Fort Saskatchewan'],
    'calgary': ['Airdrie', 'Cochrane', 'Okotoks', 'Chestermere', 'Strathmore'],
    'red deer': ['Sylvan Lake', 'Lacombe', 'Blackfalds', 'Innisfail'],
    'lethbridge': ['Coaldale', 'Taber', 'Picture Butte'],
    'grande prairie': ['Clairmont', 'Sexsmith', 'Beaverlodge'],
    'fort mcmurray': ['Wood Buffalo'],
    'medicine hat': ['Redcliff', 'Brooks'],
  }
  
  // If user is in a major city, return its suburbs
  if (albertaCities[cityLower]) {
    return albertaCities[cityLower]
  }
  
  // If user is in a suburb, return the major city first
  for (const [majorCity, suburbs] of Object.entries(albertaCities)) {
    if (suburbs.some(s => s.toLowerCase() === cityLower)) {
      return [majorCity.charAt(0).toUpperCase() + majorCity.slice(1), ...suburbs.filter(s => s.toLowerCase() !== cityLower)]
    }
  }
  
  // Default: return major Alberta cities
  if (province.toLowerCase() === 'alberta') {
    return ['Edmonton', 'Calgary', 'Red Deer', 'Lethbridge']
  }
  
  // For other provinces, just return empty (no fallback)
  return []
}

// Responsive items per slide
const { width } = useDisplay()
const perSlide = computed(() => {
  if (width.value < 960) return 1  // mobile: 1 item
  if (width.value < 1280) return 2  // md: 2 items  
  return 3  // lg+: 3 items
})

const chunks = computed(() => {
  const result: Property[][] = []
  const list = displayProperties.value.slice(0, 12)
  for (let i = 0; i < list.length; i += perSlide.value) {
    result.push(list.slice(i, i + perSlide.value))
  }
  return result
})

const totalSlides = computed(() => Math.max(1, chunks.value.length))
const currentSlide = ref(0)

// Reset slide when screen size changes to prevent out of bounds
watch(totalSlides, (newTotal) => {
  if (currentSlide.value >= newTotal) {
    currentSlide.value = 0
  }
})

function prev() { currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value }
function next() { currentSlide.value = (currentSlide.value + 1) % totalSlides.value }
function go(i: number) { currentSlide.value = Math.min(Math.max(0, i), totalSlides.value - 1) }

const trackStyle = computed(() => ({
  transform: `translateX(-${currentSlide.value * 100}%)`
}))

// Fetch on mount
onMounted(() => {
  fetchFeaturedProperties()
})
</script>

<style scoped>
.featured-deals {
  position: relative;
}

.location-badge {
  display: flex;
  justify-content: center;
}

.modern-carousel {
  position: relative;
}

.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.carousel-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 50px;
  height: 50px;
}

.carousel-nav-left {
  left: -25px;
}

.carousel-nav-right {
  right: -25px;
}

.viewport { 
  overflow: hidden; 
  width: 100%; 
  flex: 1;
}

.track { 
  display: flex; 
  width: 100%; 
}

.slide { 
  flex: 0 0 100%; 
  width: 100%;
}

.transition-fast { 
  transition: transform 300ms ease; 
}

.property-item {
  min-width: 300px;
  height: 420px;
}

.carousel-dots {
  gap: 0.5rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dot.active {
  background: #2c3e50;
}

.dot:hover {
  background: #6b7280;
}

@media (max-width: 960px) {
  .property-item {
    min-width: 280px;
    height: 420px;
  }
  
  .carousel-nav-left {
    left: -15px;
  }
  
  .carousel-nav-right {
    right: -15px;
  }
}

@media (max-width: 600px) {
  .property-item {
    min-width: 250px;
    height: 420px;
  }
  
  .carousel-nav-btn {
    width: 40px;
    height: 40px;
  }
  
  .carousel-nav-left {
    left: -10px;
  }
  
  .carousel-nav-right {
    right: -10px;
  }
}
</style>

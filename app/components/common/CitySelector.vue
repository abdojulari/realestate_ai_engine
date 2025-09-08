<template>
  <v-autocomplete
    v-model="selectedCity"
    :items="cityOptions"
    :loading="loading"
    label="Select City"
    placeholder="Choose your city to see properties"
    variant="outlined"
    density="compact"
    prepend-inner-icon="mdi-city"
    clearable
    item-title="label" 
    item-value="name"
    @update:model-value="handleCityChange"
  >
    <template v-slot:prepend>
      <v-icon v-if="detectedCity" color="success" class="mr-2">mdi-crosshairs-gps</v-icon>
    </template>
    
    <template v-slot:item="{ props, item }">
      <v-list-item v-bind="props">
        <template v-slot:prepend>
          <v-avatar size="small" color="primary" class="mr-3">
            <span class="text-caption">{{ item.raw.count }}</span>
          </v-avatar>
        </template>
        <template v-slot:title>
          <span>{{ item.raw.name }}</span>
          <v-chip 
            v-if="item.raw.name === detectedCity" 
            size="small" 
            color="success" 
            class="ml-2"
          >
            Near You
          </v-chip>
        </template>
        <template v-slot:subtitle>
          <span class="text-caption">
            {{ item.raw.count }} properties • 
            Avg: ${{ item.raw.stats?.avgPrice?.toLocaleString() || 'N/A' }} • 
            {{ Math.round((item.raw.sources?.crea || 0) / item.raw.count * 100) }}% MLS
          </span>
        </template>
      </v-list-item>
    </template>

    <template v-slot:no-data>
      <v-list-item>
        <template v-slot:title>
          <span v-if="loading">Loading cities...</span>
          <span v-else>No cities found</span>
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface City {
  name: string
  count: number
  province: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  stats: {
    avgPrice: number
    minPrice: number
    maxPrice: number
    avgSqft: number
  }
  sources: {
    crea: number
    manual: number
  }
}

interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'citySelected', city: City | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedCity = ref(props.modelValue || '')
const cities = ref<City[]>([])
const loading = ref(false)
const detectedCity = ref('')

// Computed property for city options
const cityOptions = computed(() => {
  return cities.value.map(city => ({
    ...city,
    label: `${city.name} (${city.count} properties)`
  }))
})

// Load cities from API
const loadCities = async () => {
  loading.value = true
  try {
    console.log('🏙️ Loading cities...')
    const response = await fetch('/api/properties/cities')
    if (response.ok) {
      cities.value = await response.json()
      console.log(`✅ Loaded ${cities.value.length} cities`)
      
      // Auto-detect user city after cities are loaded
      await detectUserCity()
    } else {
      throw new Error(`Failed to load cities: ${response.statusText}`)
    }
  } catch (error) {
    console.error('❌ Failed to load cities:', error)
  } finally {
    loading.value = false
  }
}

// Detect user's city based on geolocation
const detectUserCity = async () => {
  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocation not available')
    return
  }

  try {
    console.log('📍 Detecting user location...')
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        enableHighAccuracy: false,
        maximumAge: 300000 // 5 minutes
      })
    })
    
    const { latitude, longitude } = position.coords
    console.log(`📍 User location: ${latitude}, ${longitude}`)
    
    const nearestCity = findNearestCity(latitude, longitude)
    
    if (nearestCity) {
      detectedCity.value = nearestCity.name
      console.log(`🎯 Detected nearest city: ${nearestCity.name} (${nearestCity.count} properties)`)
      
      // Auto-select detected city if no city is currently selected
      if (!selectedCity.value) {
        selectedCity.value = nearestCity.name
        handleCityChange(nearestCity.name)
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not detect location:', error)
  }
}

// Find nearest city based on coordinates
const findNearestCity = (lat: number, lng: number): City | null => {
  if (cities.value.length === 0) return null

  let nearest = null
  let minDistance = Infinity

  for (const city of cities.value) {
    if (city.coordinates) {
      const distance = calculateDistance(
        lat, lng,
        city.coordinates.latitude,
        city.coordinates.longitude
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearest = city
      }
    }
  }

  return nearest
}

// Calculate distance between coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in km
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

// Handle city selection
const handleCityChange = (cityName: string) => {
  selectedCity.value = cityName
  emit('update:modelValue', cityName)
  
  const selectedCityData = cities.value.find(c => c.name === cityName)
  emit('citySelected', selectedCityData || null)
  
  if (selectedCityData) {
    console.log(`🏙️ Selected ${selectedCityData.name}: ${selectedCityData.count} properties`)
  }
}

// Load cities on mount
onMounted(() => {
  loadCities()
})
</script>

<style scoped>
.v-autocomplete {
  margin-bottom: 16px;
}
</style>

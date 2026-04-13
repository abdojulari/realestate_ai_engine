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

const cityOptions = computed(() => {
  return cities.value.map(city => ({
    ...city,
    label: `${city.name} (${city.count} properties)`
  }))
})

const loadCities = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/properties/cities')
    if (response.ok) {
      cities.value = await response.json()
      await detectUserCity()
    } else {
      throw new Error(`Failed to load cities: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Failed to load cities:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Multi-layer city detection:
 * 1. Browser geolocation → server reverse geocode (Nominatim)
 * 2. Server IP-based geolocation (ip-api.com)
 * 3. Haversine distance to city coordinates
 * 4. Default to top city by property count
 */
const detectUserCity = async () => {
  if (selectedCity.value) return

  // Layer 1: Try browser geolocation + server-side reverse geocoding
  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          enableHighAccuracy: false,
          maximumAge: 300000
        })
      })

      const { latitude, longitude } = position.coords
      const detected = await serverDetectLocation(latitude, longitude)
      if (detected) return
      
      // If server reverse geocode failed, try Haversine locally
      const nearest = findNearestCity(latitude, longitude)
      if (nearest) {
        selectDetectedCity(nearest.name, true)
        return
      }
    } catch {
      console.log('Browser geolocation unavailable, trying IP-based detection...')
    }
  }

  // Layer 2: Server-side IP geolocation (no browser permission needed)
  try {
    const detected = await serverDetectLocation()
    if (detected) return
  } catch {
    console.log('IP geolocation failed, using default...')
  }

  // Layer 3: Default to top city
  fallbackToTopCity()
}

/**
 * Call server endpoint for location detection.
 * If lat/lng provided, does Nominatim reverse geocode.
 * Otherwise, uses IP-based geolocation.
 */
const serverDetectLocation = async (lat?: number, lng?: number): Promise<boolean> => {
  try {
    const params = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ''
    const res = await fetch(`/api/detect-location${params}`)
    if (!res.ok) return false

    const data = await res.json()
    if (!data.city) return false

    // Match the detected city name against our available cities (case-insensitive)
    const matchedCity = cities.value.find(
      c => c.name.toLowerCase() === data.city.toLowerCase()
    )

    if (matchedCity) {
      selectDetectedCity(matchedCity.name, true)
      return true
    }

    // Partial match: city name contains or is contained by detected name
    const partialMatch = cities.value.find(
      c => c.name.toLowerCase().includes(data.city.toLowerCase()) ||
           data.city.toLowerCase().includes(c.name.toLowerCase())
    )

    if (partialMatch) {
      selectDetectedCity(partialMatch.name, true)
      return true
    }

    // If we got coordinates back, try Haversine distance as last resort
    if (data.latitude && data.longitude) {
      const nearest = findNearestCity(data.latitude, data.longitude)
      if (nearest) {
        selectDetectedCity(nearest.name, false)
        return true
      }
    }
  } catch (e) {
    console.warn('Server location detection failed:', e)
  }
  return false
}

const selectDetectedCity = (cityName: string, isGeoDetected: boolean) => {
  detectedCity.value = isGeoDetected ? cityName : ''
  selectedCity.value = cityName
  handleCityChange(cityName)
  console.log(`📍 ${isGeoDetected ? 'Detected' : 'Selected'} city: ${cityName}`)
}

const fallbackToTopCity = () => {
  if (selectedCity.value || cities.value.length === 0) return
  const sorted = [...cities.value].sort((a, b) => b.count - a.count)
  const topCity = sorted[0]
  if (topCity) {
    selectedCity.value = topCity.name
    handleCityChange(topCity.name)
    console.log('📍 Defaulted to city with most properties:', topCity.name)
  }
}

const findNearestCity = (lat: number, lng: number): City | null => {
  if (cities.value.length === 0) return null

  let nearest: City | null = null
  let minDistance = Infinity

  for (const city of cities.value) {
    if (city.coordinates) {
      const distance = haversineDistance(
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

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const handleCityChange = (cityName: string) => {
  selectedCity.value = cityName
  emit('update:modelValue', cityName)
  const selectedCityData = cities.value.find(c => c.name === cityName)
  emit('citySelected', selectedCityData || null)
}

onMounted(() => {
  loadCities()
})
</script>

<style scoped>
.v-autocomplete {
  margin-bottom: 16px;
}
</style>

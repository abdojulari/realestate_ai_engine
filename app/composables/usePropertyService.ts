// Composable for Property Service Worker Management
export interface City {
  name: string
  count: number
  province: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

export interface PropertySearchFilters {
  city?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  beds?: number
  baths?: number
  minSqft?: number
  maxSqft?: number
  status?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export const usePropertyService = () => {
  const serviceWorker = ref<ServiceWorker | null>(null)
  const cities = ref<City[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Register service worker - TEMPORARILY DISABLED
  const registerServiceWorker = async () => {
    console.log('⚠️ Service Worker registration temporarily disabled for agent data debugging')
    
    // Unregister existing service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (let registration of registrations) {
        console.log('🗑️ Unregistering service worker:', registration)
        await registration.unregister()
      }
    }
    
    throw new Error('Service Worker temporarily disabled')
    
    // if ('serviceWorker' in navigator) {
    //   try {
    //     const registration = await navigator.serviceWorker.register('/sw-properties.js')
    //     console.log('✅ Property Service Worker registered:', registration)
        
    //     // Wait for the service worker to be ready
    //     const sw = await navigator.serviceWorker.ready
    //     serviceWorker.value = sw.active
        
    //     return registration
    //   } catch (error) {
    //     console.error('❌ Service Worker registration failed:', error)
    //     throw error
    //   }
    // } else {
    //   throw new Error('Service Workers not supported')
    // }
  }

  // Send message to service worker
  const sendMessage = <T>(type: string, payload?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!serviceWorker.value) {
        reject(new Error('Service Worker not available'))
        return
      }

      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        const { type: responseType, data, error: responseError } = event.data
        
        if (responseType === 'ERROR') {
          reject(new Error(responseError))
        } else {
          resolve(data)
        }
      }

      serviceWorker.value.postMessage(
        { type, payload },
        [messageChannel.port2]
      )
    })
  }

  // Load available cities
  const loadCities = async (): Promise<City[]> => {
    loading.value = true
    error.value = null
    
    try {
      const cityData = await sendMessage<[string, City][]>('LOAD_CITIES')
      cities.value = cityData.map(([name, data]) => data)
      console.log('🏙️ Loaded cities:', cities.value.length)
      return cities.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load cities'
      console.error('❌ Failed to load cities:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Load properties for a specific city
  const loadCityProperties = async (cityName: string, limit = 500): Promise<any[]> => {
    loading.value = true
    error.value = null
    
    try {
      const result = await sendMessage<{ city: string; properties: any[]; total: number }>('LOAD_CITY_PROPERTIES', {
        city: cityName,
        limit
      })
      
      console.log(`🏠 Loaded ${result.properties.length} properties for ${cityName}`)
      return result.properties
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load city properties'
      console.error('❌ Failed to load city properties:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Search properties with filters
  const searchProperties = async (filters: PropertySearchFilters): Promise<any[]> => {
    loading.value = true
    error.value = null
    
    try {
      // Try service worker first, fallback to direct API call
      if (serviceWorker.value) {
        const properties = await sendMessage<any[]>('SEARCH_PROPERTIES', filters)
        console.log('🔍 Search completed via service worker:', properties.length, 'properties')
        return properties
      } else {
        // Fallback to direct API call when service worker is not available
        console.log('🔄 Service worker not available, using direct API call')
        
        // Convert filters to query parameters for the GET endpoint
        const queryParams = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            queryParams.append(key, String(value))
          }
        })
        
        const response = await $fetch(`/api/properties?${queryParams.toString()}`) as any
        console.log('🔍 Search API response type:', typeof response, Array.isArray(response))
        console.log('🔍 Search API response keys:', Object.keys(response))
        console.log('🔍 Search API first property:', response.properties?.[0] || response[0])
        
        // Handle both array and paginated response formats
        const properties = Array.isArray(response) ? response : (response.properties || [])
        console.log('🔍 Search completed via direct API:', properties.length, 'properties')
        return properties as any[]
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      console.error('❌ Search failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Prefetch popular cities
  const prefetchPopularCities = async (): Promise<void> => {
    try {
      if (serviceWorker.value) {
        await sendMessage('PREFETCH_POPULAR_CITIES')
        console.log('🚀 Popular cities prefetched via service worker')
      } else {
        // Fallback: just fetch cities to warm up the cache
        await $fetch('/api/properties/cities')
        console.log('🚀 Cities fetched via direct API (service worker not available)')
      }
    } catch (err) {
      console.warn('⚠️ Failed to prefetch popular cities:', err)
    }
  }

  // Multi-layer city detection: browser geolocation → server IP geolocation → Haversine
  const detectUserCity = async (): Promise<City | null> => {
    // Layer 1: Browser geolocation + server reverse geocode
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000, enableHighAccuracy: false, maximumAge: 300000
          })
        })
        const { latitude, longitude } = position.coords
        const serverResult = await matchCityFromServer(latitude, longitude)
        if (serverResult) return serverResult
        return findNearestCity(latitude, longitude)
      } catch {
        console.log('Browser geolocation unavailable, trying IP-based...')
      }
    }

    // Layer 2: Server-side IP geolocation
    const ipResult = await matchCityFromServer()
    if (ipResult) return ipResult

    return null
  }

  const matchCityFromServer = async (lat?: number, lng?: number): Promise<City | null> => {
    try {
      const params = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ''
      const res = await fetch(`/api/detect-location${params}`)
      if (!res.ok) return null
      const data = await res.json()
      if (!data.city) return null

      const matched = cities.value.find(
        c => c.name.toLowerCase() === data.city.toLowerCase()
      ) || cities.value.find(
        c => c.name.toLowerCase().includes(data.city.toLowerCase()) ||
             data.city.toLowerCase().includes(c.name.toLowerCase())
      )
      if (matched) return matched

      if (data.latitude && data.longitude) {
        return findNearestCity(data.latitude, data.longitude)
      }
    } catch {
      // Silent fail
    }
    return null
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

  // Calculate distance between two coordinates (Haversine formula)
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

  return {
    cities: readonly(cities),
    loading: readonly(loading),
    error: readonly(error),
    registerServiceWorker,
    loadCities,
    loadCityProperties,
    searchProperties,
    prefetchPopularCities,
    detectUserCity
  }
}

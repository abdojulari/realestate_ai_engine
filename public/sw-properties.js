// Service Worker for Property Management
const CACHE_NAME = 'suhani-properties-v1'
const API_BASE = self.location.origin

// Property cache storage
let propertiesCache = new Map()
let citiesCache = new Map()

// Install event - setup initial cache
self.addEventListener('install', event => {
  console.log('🔧 Properties Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Properties cache opened')
      return cache.addAll([
        '/api/properties/cities',
        '/api/properties/featured'
      ])
    })
  )
  self.skipWaiting()
})

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('🚀 Properties Service Worker activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Message handler for property requests
self.addEventListener('message', async event => {
  const { type, payload } = event.data
  
  try {
    switch (type) {
      case 'LOAD_CITIES':
        await loadCities()
        event.ports[0].postMessage({ type: 'CITIES_LOADED', data: Array.from(citiesCache.entries()) })
        break
        
      case 'LOAD_CITY_PROPERTIES':
        const { city, limit = 10000 } = payload
        const properties = await loadCityProperties(city, limit)
        event.ports[0].postMessage({ 
          type: 'CITY_PROPERTIES_LOADED', 
          data: { city, properties, total: properties.length } 
        })
        break
        
      case 'SEARCH_PROPERTIES':
        const searchResults = await searchProperties(payload)
        event.ports[0].postMessage({ 
          type: 'SEARCH_RESULTS', 
          data: searchResults 
        })
        break
        
      case 'PREFETCH_POPULAR_CITIES':
        await prefetchPopularCities()
        event.ports[0].postMessage({ type: 'PREFETCH_COMPLETE' })
        break
        
      default:
        console.warn('Unknown message type:', type)
    }
  } catch (error) {
    console.error('Service Worker error:', error)
    event.ports[0].postMessage({ 
      type: 'ERROR', 
      error: error.message 
    })
  }
})

// Load and cache cities with property counts
async function loadCities() {
  console.log('🏙️ Loading cities...')
  
  try {
    const response = await fetch(`${API_BASE}/api/properties/cities`)
    if (!response.ok) throw new Error('Failed to fetch cities')
    
    const cities = await response.json()
    
    // Cache cities
    citiesCache.clear()
    cities.forEach(city => {
      citiesCache.set(city.name, city)
    })
    
    console.log(`✅ Loaded ${cities.length} cities`)
    return cities
  } catch (error) {
    console.error('❌ Failed to load cities:', error)
    throw error
  }
}

// Load properties for a specific city
async function loadCityProperties(cityName, limit = 10000) {
  console.log(`🏠 Loading properties for ${cityName} (limit: ${limit})...`)
  
  const cacheKey = `${cityName}-${limit}`
  
  // Check if already cached
  if (propertiesCache.has(cacheKey)) {
    console.log(`📋 Using cached properties for ${cityName}`)
    return propertiesCache.get(cacheKey)
  }
  
  try {
    const url = `${API_BASE}/api/properties?city=${encodeURIComponent(cityName)}&limit=${limit}&includeCrea=true&includeManual=true`
    const response = await fetch(url)
    
    if (!response.ok) throw new Error(`Failed to fetch properties for ${cityName}`)
    
    const result = await response.json()
    const properties = Array.isArray(result) ? result : (result.properties || [])
    
    // Cache the results
    propertiesCache.set(cacheKey, properties)
    
    console.log(`✅ Loaded ${properties.length} properties for ${cityName}`)
    return properties
  } catch (error) {
    console.error(`❌ Failed to load properties for ${cityName}:`, error)
    throw error
  }
}

// Search properties with filters
async function searchProperties(filters) {
  console.log('🔍 SW: Searching properties with filters:', filters)
  
  try {
    const params = new URLSearchParams()
    
    // Set pagination defaults - map use wants ALL properties unless specified
    const limit = Number(filters.limit) || 10000
    const page = Number(filters.page) || 1
    
    // Add all filter parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key].toString())
      }
    })
    // Ensure our default/high limit is respected
    if (!params.has('limit')) params.append('limit', String(limit))
    
    const url = `${API_BASE}/api/properties?${params.toString()}`
    console.log('🔗 SW: Fetching from URL:', url)
    
    const response = await fetch(url)
    
    if (!response.ok) throw new Error('Search failed')
    
    const result = await response.json()
    
    // Handle both old array format and new paginated format
    if (Array.isArray(result)) {
      console.log(`✅ SW: Search completed (old format): ${result.length} properties found`)
      return result
    } else {
      // New paginated format
      const properties = result.properties || []
      console.log(`✅ SW: Search completed (paginated): ${properties.length} of ${result.pagination?.total || 0} properties found`)
      return properties // Return just the properties array for compatibility
    }
  } catch (error) {
    console.error('❌ SW: Search failed:', error)
    throw error
  }
}

// Prefetch properties for popular cities
async function prefetchPopularCities() {
  console.log('🚀 Prefetching popular cities...')
  
  const popularCities = ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat']
  
  for (const city of popularCities) {
    try {
      await loadCityProperties(city, 200) // Load first 200 properties for each popular city
      console.log(`✅ Prefetched ${city}`)
    } catch (error) {
      console.warn(`⚠️ Failed to prefetch ${city}:`, error.message)
    }
  }
  
  console.log('🎉 Popular cities prefetch complete')
}

// Network-first strategy for API requests
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/properties')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache on network failure
          return caches.match(event.request)
        })
    )
  }
})

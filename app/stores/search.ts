import { defineStore } from 'pinia'

export interface SearchFilters {
  selectedCity?: string
  priceRange?: [number, number]
  bedrooms?: number
  bathrooms?: number
  propertyType?: string
  sortBy?: string
  searchQuery?: string
}

export interface Property {
  id: number
  title: string
  price: number
  beds: number
  baths: number
  sqft: number
  address: string
  city: string
  description?: string
  images?: string[]
  features?: string[]
  propertyType?: string
  yearBuilt?: number
  lotSize?: string
  listingAgent?: string
  listingDate?: string
  status?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface SearchState {
  // Search Query & Filters
  currentQuery: string
  filters: SearchFilters
  
  // Results
  searchResults: Property[]
  searchHistory: Array<{
    query: string
    filters: SearchFilters
    timestamp: Date
    resultCount: number
  }>
  
  // UI State
  isSearching: boolean
  hasSearched: boolean
  currentPage: number
  totalPages: number
  totalResults: number
  resultsPerPage: number
  
  // AI Search Specific
  aiInterpretation?: {
    detected_filters: Record<string, any>
    query_understanding: string
    search_suggestions?: string[]
  }
  
  // Cities data
  availableCities: Array<{
    name: string
    count: number
  }>
  
  // Error handling
  lastError?: string
}

export const useSearchStore = defineStore('search', {
  state: (): SearchState => ({
    currentQuery: '',
    filters: {},
    searchResults: [],
    searchHistory: [],
    isSearching: false,
    hasSearched: false,
    currentPage: 1,
    totalPages: 0,
    totalResults: 0,
    resultsPerPage: 12,
    availableCities: [],
    lastError: undefined
  }),

  getters: {
    // Check if there are search results
    hasResults: (state) => state.searchResults.length > 0,

    // Get search summary
    searchSummary: (state) => {
      if (!state.hasSearched) return ''
      if (state.totalResults === 0) return 'No properties found'
      if (state.totalResults === 1) return '1 property found'
      return `${state.totalResults} properties found`
    },

    // Get current filters as readable text
    activeFiltersText: (state) => {
      const filters = []
      if (state.filters.selectedCity) filters.push(`in ${state.filters.selectedCity}`)
      if (state.filters.bedrooms) filters.push(`${state.filters.bedrooms}+ beds`)
      if (state.filters.bathrooms) filters.push(`${state.filters.bathrooms}+ baths`)
      if (state.filters.propertyType) filters.push(state.filters.propertyType)
      if (state.filters.priceRange) {
        const [min, max] = state.filters.priceRange
        filters.push(`$${min.toLocaleString()} - $${max.toLocaleString()}`)
      }
      return filters.join(', ')
    },

    // Get recent searches
    recentSearches: (state) => {
      return state.searchHistory
        .slice(-5)
        .reverse()
        .map(search => ({
          ...search,
          timeAgo: getTimeAgo(search.timestamp)
        }))
    }
  },

  actions: {
    // Set search query
    setQuery(query: string) {
      this.currentQuery = query
    },

    // Update filters
    updateFilters(filters: Partial<SearchFilters>) {
      this.filters = { ...this.filters, ...filters }
    },

    // Clear all filters
    clearFilters() {
      this.filters = {}
      this.currentQuery = ''
    },

    // Set search results
    setSearchResults(results: Property[], total?: number) {
      console.log('🏪 Store setSearchResults called with:', results.length, 'properties, total:', total)
      this.searchResults = results
      this.totalResults = total || results.length
      this.totalPages = Math.ceil(this.totalResults / this.resultsPerPage)
      this.hasSearched = true
      this.lastError = undefined
      console.log('🏪 Store state after setSearchResults:', {
        searchResults: this.searchResults.length,
        totalResults: this.totalResults,
        totalPages: this.totalPages
      })
    },

    // Add to search history
    addToHistory(query: string, filters: SearchFilters, resultCount: number) {
      const historyEntry = {
        query,
        filters: { ...filters },
        timestamp: new Date(),
        resultCount
      }
      
      // Remove duplicate if exists
      this.searchHistory = this.searchHistory.filter(
        h => h.query !== query || JSON.stringify(h.filters) !== JSON.stringify(filters)
      )
      
      this.searchHistory.push(historyEntry)
      
      // Keep only last 20 searches
      if (this.searchHistory.length > 20) {
        this.searchHistory = this.searchHistory.slice(-20)
      }
    },

    // Set page and fetch results for new page
    async setPage(page: number) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
        // If we have existing search results, fetch new page
        if (this.hasSearched && this.aiInterpretation) {
          await this.fetchPage(page)
        }
      }
    },

    // Fetch specific page of results (for pagination)
    async fetchPage(page: number) {
      this.isSearching = true
      this.currentPage = page
      
      try {
        // Use existing AI interpretation to build query params
        const queryParams = new URLSearchParams()
        
        if (this.aiInterpretation?.detected_filters) {
          Object.entries(this.aiInterpretation.detected_filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
              // Handle mappings for the existing API
              if (key === 'beds') {
                queryParams.append('bedsExact', String(value))
              } else if (key === 'garageSpaces') {
                queryParams.append('features', 'garage')
              } else if (key === 'basement') {
                queryParams.append('features', 'basement')
              } else if (key === 'garage' && value === true) {
                queryParams.append('features', 'garage')
              } else if (key === 'features' && typeof value === 'object') {
                Object.entries(value).forEach(([featureKey, featureValue]) => {
                  if (featureValue === true) {
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
        }

        // Add city filter if selected
        if (this.filters.selectedCity) {
          queryParams.append('city', this.filters.selectedCity)
        }

        // Add pagination parameters
        queryParams.append('limit', String(this.resultsPerPage))
        queryParams.append('page', String(page))

        // Fetch properties for the specific page
        const apiUrl = `/api/properties?${queryParams.toString()}`
        console.log('📄 Pagination API URL:', apiUrl)
        const response = await $fetch(apiUrl)

        if (response && response.properties) {
          this.setSearchResults(response.properties, response.pagination?.total)
          this.totalPages = response.pagination?.totalPages || 1
          return response
        } else {
          throw new Error('Invalid response format')
        }
      } catch (error: any) {
        this.lastError = error.data?.statusMessage || 'Failed to load page'
        throw error
      } finally {
        this.isSearching = false
      }
    },

    // Search actions
    async performAISearch(query: string, city?: string) {
      this.isSearching = true
      this.lastError = undefined
      this.currentQuery = query
      
      if (city) {
        this.filters.selectedCity = city
      }

      try {
        // Step 1: Parse the natural language query
        const parseResult = await $fetch('/api/ai/parse-property-query', {
          method: 'POST',
          body: { query }
        })

        // Set AI interpretation
        this.aiInterpretation = {
          detected_filters: parseResult.filters,
          query_understanding: parseResult.originalQuery,
          search_suggestions: parseResult.extractedFeatures
        }

        // Step 2: Convert parsed filters to API parameters
        const queryParams = new URLSearchParams()
        
        Object.entries(parseResult.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // Handle mappings for the existing API
            if (key === 'beds') {
              queryParams.append('bedsExact', String(value))
            } else if (key === 'garageSpaces') {
              queryParams.append('features', 'garage')
            } else if (key === 'basement') {
              queryParams.append('features', 'basement')
            } else if (key === 'garage' && value === true) {
              queryParams.append('features', 'garage')
            } else if (key === 'features' && typeof value === 'object') {
              Object.entries(value).forEach(([featureKey, featureValue]) => {
                if (featureValue === true) {
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
        if (this.filters.selectedCity) {
          queryParams.append('city', this.filters.selectedCity)
        }

        // Add pagination parameters
        queryParams.append('limit', String(this.resultsPerPage))
        queryParams.append('page', String(this.currentPage))

        // Step 3: Search properties using existing API
        const apiUrl = `/api/properties?${queryParams.toString()}`
        console.log('🔗 AI Search API URL:', apiUrl)
        const response = await $fetch(apiUrl)

        if (response && response.properties) {
          this.setSearchResults(response.properties, response.pagination?.total)
          this.totalPages = response.pagination?.totalPages || 1
          this.addToHistory(query, this.filters, response.properties.length)
          return response
        } else {
          throw new Error('Invalid response format')
        }
      } catch (error: any) {
        this.lastError = error.data?.statusMessage || 'Search failed'
        this.setSearchResults([])
        throw error
      } finally {
        this.isSearching = false
      }
    },

    // Load cities
    async loadCities() {
      try {
        const cities = await $fetch('/api/properties/cities')
        this.availableCities = cities
      } catch (error) {
        console.error('Failed to load cities:', error)
      }
    },

    // Restore search from history
    restoreSearch(historyEntry: SearchState['searchHistory'][0]) {
      this.currentQuery = historyEntry.query
      this.filters = { ...historyEntry.filters }
    },

    // Set AI interpretation
    setAIInterpretation(interpretation: SearchState['aiInterpretation']) {
      this.aiInterpretation = interpretation
    },

    // Set loading state
    setSearching(loading: boolean) {
      this.isSearching = loading
    },

    // Set error
    setError(error: string) {
      this.lastError = error
      this.isSearching = false
    },

    // Clear search
    clearSearch() {
      this.searchResults = []
      this.hasSearched = false
      this.currentPage = 1
      this.totalPages = 0
      this.totalResults = 0
      this.lastError = undefined
      this.aiInterpretation = undefined
    }
  },

  persist: {
    paths: ['searchHistory', 'filters', 'currentQuery', 'availableCities']
  }
})

// Utility function for time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

import { defineStore } from 'pinia'
import type { Property } from './search'

export interface PropertyDetails extends Property {
  // Extended property details
  gallery?: string[]
  virtualTour?: string
  floorPlan?: string
  latitude?: number
  longitude?: number
  province?: string
  postalCode?: string
  mlsNumber?: string
  type?: string
  yearBuilt?: string
  garage?: string
  heating?: string
  cooling?: string
  lotSize?: string
  basement?: string
  taxes?: number | string
  taxYear?: string
  hoaFee?: number | string
  appliances?: string[]
  interiorFeatures?: string[]
  exteriorFeatures?: string[]
  flooring?: string[]
  poolFeatures?: string[]
  fireplaceFeatures?: string[]
  neighborhood?: {
    name: string
    walkScore?: number
    schools?: Array<{
      name: string
      type: string
      rating?: number
      distance?: string
    }>
    amenities?: Array<{
      name: string
      type: string
      distance?: string
    }>
    transportation?: Array<{
      type: string
      name: string
      distance?: string
    }>
  }
  priceHistory?: Array<{
    date: string
    price: number
    event: string
  }>
  marketStats?: {
    averagePrice: number
    medianPrice: number
    daysOnMarket: number
    pricePerSqft: number
  }
  agent?: {
    id: number
    name: string
    phone: string
    email: string
    photo?: string
    bio?: string
  }
  mortgage?: {
    downPayment: number
    monthlyPayment: number
    interestRate: number
    term: number
  }
  utilities?: {
    heating?: string
    cooling?: string
    water?: string
    internet?: boolean
  }
}

export interface PropertyState {
  // Current property being viewed
  currentProperty: PropertyDetails | null
  
  // Property cache for quick access
  propertyCache: Record<number, PropertyDetails>
  
  // Property listings (for list pages)
  featuredProperties: Property[]
  recentlyViewed: Property[]
  favorites: number[]
  comparisons: number[]
  
  // Loading states
  isLoadingProperty: boolean
  isLoadingFeatured: boolean
  
  // Filters for property listings
  listingFilters: {
    city?: string
    minPrice?: number
    maxPrice?: number
    bedrooms?: number
    bathrooms?: number
    propertyType?: string
    features?: string[]
    sortBy?: 'price' | 'date' | 'size' | 'location'
    sortOrder?: 'asc' | 'desc'
  }
  
  // Map view state
  mapCenter?: {
    lat: number
    lng: number
  }
  mapZoom?: number
  mapBounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  
  // Error handling
  lastError?: string
}

export const usePropertyStore = defineStore('property', {
  state: (): PropertyState => ({
    currentProperty: null,
    propertyCache: {},
    featuredProperties: [],
    recentlyViewed: [],
    favorites: [],
    comparisons: [],
    isLoadingProperty: false,
    isLoadingFeatured: false,
    listingFilters: {},
    lastError: undefined
  }),

  getters: {
    // Get property by ID from cache or current
    getPropertyById: (state) => {
      return (id: number): PropertyDetails | Property | null => {
        if (state.currentProperty?.id === id) {
          return state.currentProperty
        }
        return state.propertyCache[id] || null
      }
    },

    // Check if property is favorited
    isFavorite: (state) => {
      return (id: number): boolean => {
        return state.favorites.includes(id)
      }
    },

    // Check if property is in comparison
    isInComparison: (state) => {
      return (id: number): boolean => {
        return state.comparisons.includes(id)
      }
    },

    // Get comparison properties
    comparisonProperties: (state) => {
      return state.comparisons
        .map(id => state.propertyCache[id])
        .filter(Boolean) as PropertyDetails[]
    },

    // Get favorite properties
    favoriteProperties: (state) => {
      return state.favorites
        .map(id => state.propertyCache[id])
        .filter(Boolean) as PropertyDetails[]
    },

    // Get filtered featured properties
    filteredFeaturedProperties: (state) => {
      let properties = [...state.featuredProperties]
      
      const filters = state.listingFilters
      
      if (filters.city) {
        properties = properties.filter(p => 
          p.city.toLowerCase().includes(filters.city!.toLowerCase())
        )
      }
      
      if (filters.minPrice) {
        properties = properties.filter(p => p.price >= filters.minPrice!)
      }
      
      if (filters.maxPrice) {
        properties = properties.filter(p => p.price <= filters.maxPrice!)
      }
      
      if (filters.bedrooms) {
        properties = properties.filter(p => p.beds >= filters.bedrooms!)
      }
      
      if (filters.bathrooms) {
        properties = properties.filter(p => p.baths >= filters.bathrooms!)
      }
      
      if (filters.propertyType) {
        properties = properties.filter(p => 
          p.propertyType?.toLowerCase() === filters.propertyType!.toLowerCase()
        )
      }
      
      // Apply sorting
      if (filters.sortBy) {
        properties.sort((a, b) => {
          let comparison = 0
          
          switch (filters.sortBy) {
            case 'price':
              comparison = a.price - b.price
              break
            case 'size':
              comparison = a.sqft - b.sqft
              break
            case 'date':
              const dateA = new Date(a.listingDate || 0).getTime()
              const dateB = new Date(b.listingDate || 0).getTime()
              comparison = dateA - dateB
              break
            default:
              comparison = 0
          }
          
          return filters.sortOrder === 'desc' ? -comparison : comparison
        })
      }
      
      return properties
    },

    // Calculate property insights
    propertyInsights: (state) => {
      if (!state.currentProperty) return null
      
      const property = state.currentProperty
      const insights = []
      
      // Price per sqft
      if (property.price && property.sqft) {
        const pricePerSqft = property.price / property.sqft
        insights.push({
          label: 'Price per sq ft',
          value: `$${pricePerSqft.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          type: 'info'
        })
      }
      
      // Market comparison
      if (property.marketStats) {
        const marketPrice = property.marketStats.averagePrice
        const difference = ((property.price - marketPrice) / marketPrice) * 100
        insights.push({
          label: 'vs Market Average',
          value: `${difference > 0 ? '+' : ''}${difference.toFixed(1)}%`,
          type: difference > 10 ? 'warning' : difference < -10 ? 'success' : 'info'
        })
      }
      
      // Days on market
      if (property.listingDate) {
        const daysOnMarket = Math.floor(
          (new Date().getTime() - new Date(property.listingDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        insights.push({
          label: 'Days on Market',
          value: `${daysOnMarket} days`,
          type: daysOnMarket > 30 ? 'warning' : 'info'
        })
      }
      
      return insights
    }
  },

  actions: {
    // Load property details
    async loadProperty(id: number, force = false) {
      // Return cached property if available and not forcing reload
      if (!force && this.propertyCache[id]) {
        this.currentProperty = this.propertyCache[id]
        return this.currentProperty
      }

      this.isLoadingProperty = true
      this.lastError = undefined

      try {
        const property = await $fetch(`/api/properties/${id}`)
        
        // Cache the property
        this.propertyCache[id] = property
        this.currentProperty = property
        
        // Add to recently viewed
        this.addToRecentlyViewed(property)
        
        return property
      } catch (error: any) {
        this.lastError = error.data?.statusMessage || 'Failed to load property'
        throw error
      } finally {
        this.isLoadingProperty = false
      }
    },

    // Load featured properties
    async loadFeaturedProperties() {
      this.isLoadingFeatured = true
      
      try {
        const properties = await $fetch('/api/properties/featured')
        this.featuredProperties = properties
        
        // Cache featured properties
        properties.forEach((property: Property) => {
          if (!this.propertyCache[property.id]) {
            this.propertyCache[property.id] = property as PropertyDetails
          }
        })
        
        return properties
      } catch (error: any) {
        this.lastError = error.data?.statusMessage || 'Failed to load featured properties'
        throw error
      } finally {
        this.isLoadingFeatured = false
      }
    },

    // Add to recently viewed
    addToRecentlyViewed(property: Property) {
      // Remove if already exists
      this.recentlyViewed = this.recentlyViewed.filter(p => p.id !== property.id)
      
      // Add to beginning
      this.recentlyViewed.unshift(property)
      
      // Keep only last 10
      if (this.recentlyViewed.length > 10) {
        this.recentlyViewed = this.recentlyViewed.slice(0, 10)
      }
    },

    // Toggle favorite
    toggleFavorite(id: number) {
      const index = this.favorites.indexOf(id)
      if (index > -1) {
        this.favorites.splice(index, 1)
      } else {
        this.favorites.push(id)
      }
    },

    // Toggle comparison
    toggleComparison(id: number) {
      const index = this.comparisons.indexOf(id)
      if (index > -1) {
        this.comparisons.splice(index, 1)
      } else {
        // Limit to 3 properties for comparison
        if (this.comparisons.length >= 3) {
          this.comparisons.shift() // Remove oldest
        }
        this.comparisons.push(id)
      }
    },

    // Clear comparisons
    clearComparisons() {
      this.comparisons = []
    },

    // Update listing filters
    updateListingFilters(filters: Partial<PropertyState['listingFilters']>) {
      this.listingFilters = { ...this.listingFilters, ...filters }
    },

    // Clear listing filters
    clearListingFilters() {
      this.listingFilters = {}
    },

    // Set map state
    setMapState(center?: { lat: number; lng: number }, zoom?: number, bounds?: PropertyState['mapBounds']) {
      if (center) this.mapCenter = center
      if (zoom) this.mapZoom = zoom
      if (bounds) this.mapBounds = bounds
    },

    // Calculate mortgage
    calculateMortgage(price: number, downPaymentPercent: number = 20, interestRate: number = 5.5, termYears: number = 25) {
      const downPayment = price * (downPaymentPercent / 100)
      const loanAmount = price - downPayment
      const monthlyRate = interestRate / 100 / 12
      const numPayments = termYears * 12
      
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      
      return {
        downPayment,
        monthlyPayment,
        interestRate,
        term: termYears,
        totalInterest: (monthlyPayment * numPayments) - loanAmount,
        totalPaid: monthlyPayment * numPayments
      }
    },

    // Set property in cache
    setCachedProperty(property: PropertyDetails) {
      this.propertyCache[property.id] = property
      // Also set as current property if not already set
      if (!this.currentProperty) {
        this.currentProperty = property
      }
    },

    // Clear cache
    clearCache() {
      this.propertyCache = {}
    },

    // Set error
    setError(error: string) {
      this.lastError = error
    },

    // Clear error
    clearError() {
      this.lastError = undefined
    }
  },

  persist: {
    paths: ['favorites', 'recentlyViewed', 'comparisons', 'listingFilters', 'mapCenter', 'mapZoom']
  }
})
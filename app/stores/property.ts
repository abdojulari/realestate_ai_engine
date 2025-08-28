import { defineStore } from 'pinia'

interface Property {
  id: number
  title: string
  price: number
  beds: number
  baths: number
  sqft: number
  type: 'house' | 'condo' | 'townhouse'
  status: 'for_sale' | 'for_rent' | 'sold'
  address: string
  city: string
  province: string
  postalCode: string
  description: string
  features: string[]
  images: string[]
  location: {
    lat: number
    lng: number
  }
}

interface PropertyState {
  properties: Property[]
  selectedProperty: Property | null
  filters: {
    priceRange: [number, number]
    beds: number | null
    baths: number | null
    propertyType: string | null
    status: string | null
  }
}

export const usePropertyStore = defineStore('property', {
  state: (): PropertyState => ({
    properties: [],
    selectedProperty: null,
    filters: {
      priceRange: [0, 1000000],
      beds: null,
      baths: null,
      propertyType: null,
      status: null,
    },
  }),

  getters: {
    filteredProperties: (state) => {
      return state.properties.filter(property => {
        if (state.filters.propertyType && property.type !== state.filters.propertyType) return false
        if (state.filters.beds && property.beds < state.filters.beds) return false
        if (state.filters.baths && property.baths < state.filters.baths) return false
        if (property.price < state.filters.priceRange[0] || property.price > state.filters.priceRange[1]) return false
        return true
      })
    },
  },

  actions: {
    setProperties(properties: Property[]) {
      this.properties = properties
    },

    setSelectedProperty(property: Property | null) {
      this.selectedProperty = property
    },

    updateFilters(filters: Partial<PropertyState['filters']>) {
      this.filters = { ...this.filters, ...filters }
    },

    async fetchProperties() {
      try {
        // This will be replaced with actual API call
        const response = await fetch('/api/properties')
        const data = await response.json()
        this.setProperties(data)
      } catch (error) {
        console.error('Error fetching properties:', error)
      }
    },
  },
})

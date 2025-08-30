import type { Property, PropertyFilter, ViewingRequest, PropertyInquiry } from '~/types'
import { useAuthStore } from '~/stores/auth'

function authHeaders(): Record<string, string> {
  try {
    const store = useAuthStore()
    const token = store?.token || (process.client ? localStorage.getItem('token') : null)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function authedFetch<T>(url: string, opts: any = {}): Promise<T> {
  const headers = { ...(opts.headers || {}), ...authHeaders() }
  return await $fetch<T>(url, { ...opts, headers })
}

export const propertyService = {
  async search(filters: PropertyFilter): Promise<Property[]> {
    const params = new URLSearchParams()
    
    // Handle all possible filter fields
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString())
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString())
    if (filters.beds) params.append('beds', filters.beds.toString())
    if (filters.baths) params.append('baths', filters.baths.toString())
    if (filters.type || filters.propertyType) params.append('type', (filters.type || filters.propertyType)!)
    if (filters.status) params.append('status', filters.status)
    if (filters.city) params.append('city', filters.city)
    if (filters.location) {
      // Extract city from location if no city is provided
      if (!filters.city) {
        const city = filters.location.includes(',') ? filters.location.split(',')[0].trim() : filters.location
        if (city) params.append('city', city)
      }
      params.append('location', filters.location)
    }
    if (filters.province) params.append('province', filters.province)
    if (filters.minSqft) params.append('minSqft', filters.minSqft.toString())
    if (filters.maxSqft) params.append('maxSqft', filters.maxSqft.toString())
    if (filters.features && filters.features.length > 0) {
      filters.features.forEach(feature => params.append('features', feature))
    }
    
    const queryString = params.toString()
    const url = queryString ? `/api/properties?${queryString}` : '/api/properties'
    
    console.log('Property search URL:', url) // Debug log
    return await authedFetch(url)
  },

  async getById(id: number): Promise<Property> {
    return await authedFetch(`/api/properties/${id}`)
  },

  async create(data: Partial<Property>): Promise<Property> {
    return await authedFetch('/api/properties', {
      method: 'POST',
      body: data
    })
  },

  async update(id: number, data: Partial<Property>): Promise<Property> {
    return await authedFetch(`/api/properties/${id}`, {
      method: 'PUT',
      body: data
    })
  },

  async delete(id: number): Promise<void> {
    return await authedFetch(`/api/properties/${id}`, {
      method: 'DELETE'
    })
  },

  async uploadImages(id: number, files: File[]): Promise<Property> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })
    return await authedFetch(`/api/properties/${id}/images`, {
      method: 'POST',
      body: formData
    })
  },

  async requestViewing(id: number, data: Partial<ViewingRequest>): Promise<ViewingRequest> {
    return await authedFetch(`/api/properties/${id}/viewing-requests`, {
      method: 'POST',
      body: data
    })
  },

  async toggleSave(id: number): Promise<{ saved: boolean }> {
    return await authedFetch(`/api/properties/${id}/save`, {
      method: 'POST'
    })
  },

  async getSavedProperties(): Promise<Property[]> {
    return await authedFetch('/api/properties/saved')
  },

  async getMyListings(): Promise<Property[]> {
    return await authedFetch('/api/properties/my-listings')
  },

  async getMyViewingRequests(): Promise<ViewingRequest[]> {
    return await authedFetch('/api/properties/my-viewing-requests')
  },

  async updateViewingRequest(id: number, data: Partial<ViewingRequest>): Promise<ViewingRequest> {
    return await authedFetch(`/api/properties/viewing-requests/${id}`, {
      method: 'PUT',
      body: data
    })
  },

  async getMyInquiries(): Promise<PropertyInquiry[]> {
    return await authedFetch('/api/properties/my-inquiries')
  },

  async createInquiry(propertyId: number, data: Partial<PropertyInquiry>): Promise<PropertyInquiry> {
    return await authedFetch(`/api/properties/${propertyId}/inquiries`, {
      method: 'POST',
      body: data
    })
  },

  async updateInquiry(id: number, data: Partial<PropertyInquiry>): Promise<PropertyInquiry> {
    return await authedFetch(`/api/properties/inquiries/${id}`, {
      method: 'PUT',
      body: data
    })
  },

  async getPropertyViews(id: number): Promise<any[]> {
    return await authedFetch(`/api/properties/${id}/views`)
  },

  async trackView(id: number): Promise<void> {
    return await authedFetch(`/api/properties/${id}/views`, {
      method: 'POST'
    })
  }
}
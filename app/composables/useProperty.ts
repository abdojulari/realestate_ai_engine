import { ref, computed } from 'vue'
import type { Property, PropertyFilter, ViewingRequest, PropertyInquiry } from '~/types'
import { propertyService } from '~/services/property.service'

export const useProperty = () => {
  const properties = ref<Property[]>([])
  const viewingRequests = ref<ViewingRequest[]>([])
  const inquiries = ref<PropertyInquiry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadProperties = async (filters?: PropertyFilter) => {
    loading.value = true
    error.value = null
    try {
      const response = await propertyService.search(filters)
      properties.value = response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load properties'
      console.error('Error loading properties:', err)
    } finally {
      loading.value = false
    }
  }

  const loadViewingRequests = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await propertyService.getMyViewingRequests()
      viewingRequests.value = response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load viewing requests'
      console.error('Error loading viewing requests:', err)
    } finally {
      loading.value = false
    }
  }

  const loadInquiries = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await propertyService.getMyInquiries()
      inquiries.value = response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load inquiries'
      console.error('Error loading inquiries:', err)
    } finally {
      loading.value = false
    }
  }

  const toggleSave = async (propertyId: number) => {
    try {
      await propertyService.toggleSave(propertyId)
      // Update local state
      const property = properties.value.find(p => p.id === propertyId)
      if (property) {
        property.isSaved = !property.isSaved
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle save'
      console.error('Error toggling save:', err)
    }
  }

  const requestViewing = async (propertyId: number, data: any) => {
    try {
      const response = await propertyService.requestViewing(propertyId, data)
      viewingRequests.value.push(response)
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to request viewing'
      console.error('Error requesting viewing:', err)
      throw err
    }
  }

  const updateViewingRequest = async (requestId: number, status: string) => {
    try {
      await propertyService.updateViewingRequest(requestId, status)
      // Update local state
      const request = viewingRequests.value.find(r => r.id === requestId)
      if (request) {
        request.status = status
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update viewing request'
      console.error('Error updating viewing request:', err)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'success',
      pending: 'warning',
      sold: 'info',
      inactive: 'grey',
      approved: 'success',
      rejected: 'error',
      completed: 'info',
      cancelled: 'grey'
    }
    return colors[status] || 'grey'
  }

  return {
    properties,
    viewingRequests,
    inquiries,
    loading,
    error,
    loadProperties,
    loadViewingRequests,
    loadInquiries,
    toggleSave,
    requestViewing,
    updateViewingRequest,
    getStatusColor
  }
}

/**
 * API utility for making HTTP requests
 * Compatible with the existing useApi composable pattern
 */

const buildHeaders = () => {
  const headers: Record<string, any> = { 'Content-Type': 'application/json' }
  
  if (process.client) {
    const token = localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log('[API] Token found and attached to request')
    } else {
      console.warn('[API] No token found in localStorage')
    }
  }
  
  return headers
}

const handleApiError = (error: any, url: string) => {
  console.error(`[API] Request failed for ${url}:`, {
    status: error.statusCode || error.status,
    message: error.statusMessage || error.message,
    data: error.data
  })
  
  // If unauthorized, might need to refresh auth
  if (error.statusCode === 401 || error.status === 401) {
    console.error('[API] Unauthorized - Token might be expired')
    if (process.client) {
      const token = localStorage.getItem('token')
      console.error('[API] Current token in localStorage:', token ? 'EXISTS' : 'MISSING')
    }
  }
  
  throw error
}

export const api = {
  async get<T = any>(url: string, opts: any = {}): Promise<T> {
    try {
      return await $fetch<T>(url, {
        method: 'GET',
        headers: { ...buildHeaders(), ...(opts.headers || {}) },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  },

  async post<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
    try {
      const headers = buildHeaders()
      
      // If data is FormData, don't set Content-Type header (let browser set it)
      if (data instanceof FormData) {
        delete headers['Content-Type']
      }
      
      return await $fetch<T>(url, {
        method: 'POST',
        body: data,
        headers: { ...headers, ...(opts.headers || {}) },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  },

  async put<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
    try {
      const headers = buildHeaders()
      
      // If data is FormData, don't set Content-Type header
      if (data instanceof FormData) {
        delete headers['Content-Type']
      }
      
      return await $fetch<T>(url, {
        method: 'PUT',
        body: data,
        headers: { ...headers, ...(opts.headers || {}) },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  },

  async patch<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
    try {
      const headers = buildHeaders()
      
      // If data is FormData, don't set Content-Type header
      if (data instanceof FormData) {
        delete headers['Content-Type']
      }
      
      return await $fetch<T>(url, {
        method: 'PATCH',
        body: data,
        headers: { ...headers, ...(opts.headers || {}) },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  },

  async delete<T = any>(url: string, opts: any = {}): Promise<T> {
    try {
      return await $fetch<T>(url, {
        method: 'DELETE',
        headers: { ...buildHeaders(), ...(opts.headers || {}) },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  },

  async upload<T = any>(url: string, file: File | FormData, opts: any = {}): Promise<T> {
    try {
      const formData = file instanceof FormData ? file : new FormData()
      
      if (file instanceof File) {
        formData.append('file', file)
      }
      
      return await $fetch<T>(url, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - let browser handle it
          ...Object.fromEntries(
            Object.entries(buildHeaders()).filter(([key]) => key !== 'Content-Type')
          ),
          ...(opts.headers || {})
        },
        ...opts
      }) as T
    } catch (error) {
      return handleApiError(error, url)
    }
  }
}

// Export individual methods for convenience
export const { get, post, put, patch, delete: del, upload } = api

// Default export for compatibility
export default api
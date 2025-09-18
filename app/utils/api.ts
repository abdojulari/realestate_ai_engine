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
    }
  }
  
  return headers
}

export const api = {
  async get<T = any>(url: string, opts: any = {}): Promise<T> {
    return await $fetch<T>(url, {
      method: 'GET',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    }) as T
  },

  async post<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
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
  },

  async put<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
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
  },

  async patch<T = any>(url: string, data?: any, opts: any = {}): Promise<T> {
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
  },

  async delete<T = any>(url: string, opts: any = {}): Promise<T> {
    return await $fetch<T>(url, {
      method: 'DELETE',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    }) as T
  },

  async upload<T = any>(url: string, file: File | FormData, opts: any = {}): Promise<T> {
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
  }
}

// Export individual methods for convenience
export const { get, post, put, patch, delete: del, upload } = api

// Default export for compatibility
export default api
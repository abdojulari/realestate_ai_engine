import type { NitroFetchRequest } from 'nitropack'

type FetchOpts = Omit<RequestInit, 'method' | 'body'>

export function useApi() {
  const config = useRuntimeConfig()
  const { showMessage } = useNuxtApp()

  const baseURL = config.public.apiBase
  const buildHeaders = () => {
    const headers: Record<string, any> = { 'Content-Type': 'application/json' }
    if (process.client) {
      const token = localStorage.getItem('token')
      if (token) headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  const get = async <T = any>(url: string, opts: FetchOpts = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'GET',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const post = async <T = any>(url: string, data: any, opts: FetchOpts = {}) => {
    const headers = buildHeaders()
    
    // If data is FormData, don't set Content-Type header
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }
    
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'POST',
      body: data,
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts
    })
  }

  const put = async <T = any>(url: string, data: any, opts: FetchOpts = {}) => {
    const headers = buildHeaders()
    
    // If data is FormData, don't set Content-Type header
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }
    
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'PUT',
      body: data,
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts
    })
  }

  const patch = async <T = any>(url: string, data: any, opts: FetchOpts = {}) => {
    const headers = buildHeaders()
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'PATCH',
      body: data,
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts
    })
  }

  const del = async <T = any>(url: string, opts: FetchOpts = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'DELETE',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const upload = async <T = any>(url: string, formData: FormData, opts: FetchOpts = {}) => {
    const headers = buildHeaders()
    delete headers['Content-Type']
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'POST',
      body: formData as any,
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts
    })
  }

  return {
    get,
    post,
    put,
    patch,
    del,
    upload
  }
}

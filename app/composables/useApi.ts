import type { NitroFetchRequest } from 'nitropack'

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

  const get = async <T = any>(url: string, opts: RequestInit = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'get',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const post = async <T = any>(url: string, data: any, opts: RequestInit = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'post',
      body: data,
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const put = async <T = any>(url: string, data: any, opts: RequestInit = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'put',
      body: data,
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const del = async <T = any>(url: string, opts: RequestInit = {}) => {
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'delete',
      headers: { ...buildHeaders(), ...(opts.headers || {}) },
      ...opts
    })
  }

  const upload = async <T = any>(url: string, formData: FormData, opts: RequestInit = {}) => {
    const headers = buildHeaders()
    delete headers['Content-Type']
    return await $fetch<T>(url as unknown as NitroFetchRequest, {
      baseURL,
      method: 'post',
      body: formData as any,
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts
    })
  }

  return {
    get,
    post,
    put,
    del,
    upload
  }
}

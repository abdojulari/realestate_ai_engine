import { useAuthStore } from '~/stores/auth'

export const createFetchOptions = (options: any = {}) => {
  const authStore = useAuthStore()
  const token = authStore.token
  const headers: Record<string, string> = {}

  if (process.client && token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (process.server) {
    const h = useRequestHeaders(['cookie'])
    Object.assign(headers, h)
  }

  return {
    baseURL: process.env.NUXT_PUBLIC_API_BASE,
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    credentials: 'include'
  }
}

export const api = {
  async get(url: string, options: any = {}) {
    const { data, error } = await $fetch(url, {
      ...createFetchOptions(options),
      method: 'GET'
    }).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))

    if (error) {
      throw error
    }

    return data
  },

  async post(url: string, body: any, options: any = {}) {
    const { data, error } = await $fetch(url, {
      ...createFetchOptions(options),
      method: 'POST',
      body
    }).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))

    if (error) {
      throw error
    }

    return data
  },

  async put(url: string, body: any, options: any = {}) {
    const { data, error } = await $fetch(url, {
      ...createFetchOptions(options),
      method: 'PUT',
      body
    }).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))

    if (error) {
      throw error
    }

    return data
  },

  async delete(url: string, options: any = {}) {
    const { data, error } = await $fetch(url, {
      ...createFetchOptions(options),
      method: 'DELETE'
    }).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))

    if (error) {
      throw error
    }

    return data
  },

  async patch(url: string, body: any, options: any = {}) {
    const { data, error } = await $fetch(url, {
      ...createFetchOptions(options),
      method: 'PATCH',
      body
    }).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))

    if (error) {
      throw error
    }

    return data
  }
}

// Plugin to inject API into app context
export default defineNuxtPlugin(() => {
  return {
    provide: {
      api
    }
  }
})
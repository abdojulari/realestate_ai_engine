import { defineNuxtPlugin } from 'nuxt/app'
import { useAuthStore } from '~/stores/auth'
import type { AuthResponse } from '~/types'

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()

  const checkAuth = async () => {
    if (!process.client) return
    const token = localStorage.getItem('token')
    console.log('[AUTH PLUGIN] Checking auth, token exists:', !!token)
    
    if (!token) {
      console.log('[AUTH PLUGIN] No token found in localStorage')
      return
    }
    
    try {
      // Set token first so it's available for the API call
      authStore.setToken(token)
      console.log('[AUTH PLUGIN] Token set in store, calling /api/auth/me')
      
      // Use the existing /api/auth/me endpoint
      const user = await $fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (user) {
        console.log('[AUTH PLUGIN] ✅ User authenticated:', user.email)
        authStore.setUser(user)
      } else {
        console.log('[AUTH PLUGIN] ❌ No user returned from API')
        localStorage.removeItem('token')
        authStore.clearAuth()
      }
    } catch (error) {
      console.error('[AUTH PLUGIN] ❌ Auth check failed:', error)
      localStorage.removeItem('token')
      authStore.clearAuth()
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const res = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      if (res?.token) {
        if (process.client) {
          localStorage.setItem('token', res.token)
        }
        authStore.setToken(res.token)
        authStore.setUser(res.user)
        const redirect = process.client ? localStorage.getItem('redirectAfterLogin') : null
        if (redirect) {
          localStorage.removeItem('redirectAfterLogin')
          return redirect
        }
        return '/'
      }
      throw new Error('Login failed')
    } catch (error) {
      // Let the UI handle error display, just re-throw
      throw error
    }
  }

  const register = async (data: any) => {
    try {
      const res = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: data
      })
      if (res?.token) {
        if (process.client) {
          localStorage.setItem('token', res.token)
        }
        authStore.setToken(res.token)
        authStore.setUser(res.user)
        return '/'
      }
      throw new Error('Registration failed')
    } catch (error) {
      // Let the UI handle error display, just re-throw
      throw error
    }
  }

  const logout = () => {
    if (process.client) {
      localStorage.removeItem('token')
    }
    authStore.logout()
    return navigateTo('/auth/login')
  }

  // Check auth on plugin initialization (only on client)
  if (process.client) {
    await checkAuth()
  }

  return {
    provide: {
      auth: {
        login,
        register,
        logout,
        checkAuth
      }
    }
  }
})
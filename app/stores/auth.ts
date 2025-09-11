import { defineStore } from 'pinia'
import type { User, AuthResponse, RegisterData } from '../../types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    tokenExpiry: null as number | null
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.token || !state.user) return false
      
      // Check if token is expired
      if (state.tokenExpiry && Date.now() > state.tokenExpiry) {
        return false
      }
      
      return true
    },
    isAdmin: (state) => state.user?.role === 'admin',
    isAgent: (state) => state.user?.role === 'agent',
    isTokenExpired: (state) => {
      if (!state.tokenExpiry) return false
      return Date.now() > state.tokenExpiry
    }
  },

  actions: {
    setUser(user: User | null) {
      this.user = user
    },

    setToken(token: string | null) {
      this.token = token
      
      if (token) {
        // Decode JWT to get expiry time
        try {
          const parts = token.split('.')
          if (parts.length === 3 && parts[1]) {
            const payload = JSON.parse(atob(parts[1]))
            this.tokenExpiry = payload.exp * 1000 // Convert to milliseconds
          }
        } catch (error) {
          console.error('Error decoding JWT token:', error)
          this.tokenExpiry = Date.now() + (60 * 60 * 1000) // Default to 1 hour
        }
      } else {
        this.tokenExpiry = null
      }
      
      if (process.client) {
        if (token) {
          localStorage.setItem('token', token)
          if (this.tokenExpiry) {
            localStorage.setItem('tokenExpiry', this.tokenExpiry.toString())
          }
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('tokenExpiry')
        }
      }
    },

    async login(email: string, password: string): Promise<User> {
      const res = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      this.setUser(res.user)
      this.setToken(res.token)
      return res.user
    },

    async register(data: RegisterData): Promise<User> {
      const res = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: data
      })
      this.setUser(res.user)
      this.setToken(res.token)
      return res.user
    },

    async checkAuth(): Promise<void> {
      if (!this.token) {
        // Try to restore token from localStorage on client
        if (process.client) {
          const token = localStorage.getItem('token')
          const tokenExpiry = localStorage.getItem('tokenExpiry')
          
          if (token) {
            this.setToken(token)
            if (tokenExpiry) {
              this.tokenExpiry = parseInt(tokenExpiry)
            }
          } else {
            return
          }
        } else {
          return
        }
      }
      
      // Check if token is expired before making API call
      if (this.isTokenExpired) {
        this.clearAuth()
        throw new Error('Token expired')
      }
      
      try {
        const user = await $fetch<User>('/api/auth/me', {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        this.setUser(user)
      } catch (error: any) {
        // If token is invalid or expired, clear auth
        this.clearAuth()
        throw error
      }
    },

    async logout(): Promise<void> {
      this.clearAuth()
    },

    clearAuth() {
      this.setUser(null)
      this.setToken(null)
      this.tokenExpiry = null
    }
  }
})
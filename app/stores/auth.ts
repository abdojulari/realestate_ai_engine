import { defineStore } from 'pinia'
import type { User, AuthResponse, RegisterData } from '../../types'
import { userHasDelegatedAdminAccess } from '~/utils/delegatedAdminClient'

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
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    /** Account owner (not a delegated team member). */
    isPrincipalAdmin: (state) =>
      state.user?.role === 'admin' || state.user?.role === 'super_admin',
    /** Can open the admin panel: owners or users with delegated permissions. */
    isAdmin: (state) => {
      const u = state.user
      if (!u) return false
      if (u.role === 'admin' || u.role === 'super_admin') return true
      return userHasDelegatedAdminAccess(u)
    },
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

    async login(email: string, password: string, twoFactorCode?: string): Promise<User | { requiresTwoFactor: boolean; message: string; email: string }> {
      const res = await $fetch<any>('/api/auth/login', {
        method: 'POST',
        body: { email, password, twoFactorCode }
      })
      
      // Check if 2FA is required
      if (res.requiresTwoFactor) {
        return res
      }
      
      this.setUser(res.user)
      this.setToken(res.token)
      return res.user
    },

    async verify2FA(email: string, password: string, code: string): Promise<User> {
      const res = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password, twoFactorCode: code }
      })
      this.setUser(res.user)
      this.setToken(res.token)
      return res.user
    },

    async resend2FACode(email: string): Promise<void> {
      await $fetch('/api/auth/resend-2fa', {
        method: 'POST',
        body: { email }
      })
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
      try {
        // Call logout endpoint to log activity
        if (this.token) {
          await $fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.token}` }
          })
        }
      } catch (error) {
        console.error('Error during logout:', error)
      } finally {
        this.clearAuth()
      }
    },

    clearAuth() {
      this.setUser(null)
      this.setToken(null)
      this.tokenExpiry = null
    }
  }
})
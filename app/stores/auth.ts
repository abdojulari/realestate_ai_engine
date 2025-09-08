import { defineStore } from 'pinia'
import type { User, AuthResponse, RegisterData } from '../../types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isAgent: (state) => state.user?.role === 'agent'
  },

  actions: {
    setUser(user: User | null) {
      this.user = user
    },

    setToken(token: string | null) {
      this.token = token
      if (process.client) {
        if (token) localStorage.setItem('token', token)
        else localStorage.removeItem('token')
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
          if (token) {
            this.setToken(token)
          } else {
            return
          }
        } else {
          return
        }
      }
      
      try {
        const user = await $fetch<User>('/api/auth/me', {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        this.setUser(user)
      } catch {
        this.clearAuth()
      }
    },

    async logout(): Promise<void> {
      this.clearAuth()
    },

    clearAuth() {
      this.setUser(null)
      this.setToken(null)
    }
  }
})
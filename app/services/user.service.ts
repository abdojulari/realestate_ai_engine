import { api } from '~/utils/api'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phone?: string
  preferredContactTime?: string
  role: string
  provider?: string
  providerId?: string
  createdAt: string
  updatedAt: string
}

export const userService = {
  async getProfile() {
    return api.get('/users/profile')
  },

  async updateProfile(data: Partial<User>) {
    return api.put('/users/profile', data)
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return api.put('/users/change-password', data)
  },

  async updateNotificationPreferences(preferences: Record<string, boolean>) {
    return api.put('/users/notification-preferences', preferences)
  },

  // Admin-only endpoints
  async getAll(params: { page?: number; limit?: number; search?: string } = {}) {
    return api.get('/admin/users', { params })
  },

  async getById(id: number) {
    return api.get(`/admin/users/${id}`)
  },

  async create(data: Partial<User>) {
    return api.post('/admin/users', data)
  },

  async update(id: number, data: Partial<User>) {
    return api.put(`/admin/users/${id}`, data)
  },

  async delete(id: number) {
    return api.delete(`/admin/users/${id}`)
  },

  async exportUsers(format: 'csv' | 'excel' = 'csv') {
    return api.get('/admin/users/export', {
      params: { format },
      responseType: 'blob'
    })
  },

  // Analytics endpoints
  async getUserStats() {
    return api.get('/admin/users/stats')
  },

  async getActiveUsers() {
    return api.get('/admin/users/active')
  },

  async getUserActivity(id: number) {
    return api.get(`/admin/users/${id}/activity`)
  }
}

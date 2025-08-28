import { api } from '~/utils/api'

export interface ContentBlock {
  id: number
  key: string
  title: string
  content: string
  type: 'text' | 'html' | 'image' | 'testimonial'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export const contentService = {
  async getByKey(key: string) {
    return api.get(`/content/${key}`)
  },

  async getAll() {
    return api.get('/content')
  },

  async create(data: Omit<ContentBlock, 'id' | 'createdAt' | 'updatedAt'>) {
    return api.post('/content', data)
  },

  async update(id: number, data: Partial<ContentBlock>) {
    return api.put(`/content/${id}`, data)
  },

  async delete(id: number) {
    return api.delete(`/content/${id}`)
  },

  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/content/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Helper method to get multiple content blocks by keys
  async getMultiple(keys: string[]) {
    return api.post('/content/multiple', { keys })
  },

  // Helper method to get content for a specific page
  async getPageContent(page: string) {
    return api.get(`/content/page/${page}`)
  }
}

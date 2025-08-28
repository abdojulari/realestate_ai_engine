import { defineStore } from 'pinia'

interface ContentBlock {
  id: number
  key: string
  title: string
  content: string
  type: 'text' | 'html' | 'image' | 'testimonial'
  metadata?: Record<string, any>
}

interface ContentState {
  blocks: ContentBlock[]
  loading: boolean
  error: string | null
}

export const useContentStore = defineStore('content', {
  state: (): ContentState => ({
    blocks: [],
    loading: false,
    error: null,
  }),

  getters: {
    getBlockByKey: (state) => (key: string) => {
      return state.blocks.find(block => block.key === key)
    },

    getBlocksByType: (state) => (type: ContentBlock['type']) => {
      return state.blocks.filter(block => block.type === type)
    },
  },

  actions: {
    async fetchContent() {
      this.loading = true
      this.error = null
      try {
        // This will be replaced with actual API call
        const response = await fetch('/api/content')
        const data = await response.json()
        this.blocks = data
      } catch (error) {
        this.error = 'Failed to fetch content'
        console.error('Error fetching content:', error)
      } finally {
        this.loading = false
      }
    },

    async updateContent(block: ContentBlock) {
      try {
        // This will be replaced with actual API call
        await fetch(`/api/content/${block.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(block),
        })
        
        const index = this.blocks.findIndex(b => b.id === block.id)
        if (index !== -1) {
          this.blocks[index] = block
        }
      } catch (error) {
        console.error('Error updating content:', error)
        throw error
      }
    },
  },
})

import { createPersistedState } from 'pinia-plugin-persistedstate'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin(() => {
  const { $pinia } = useNuxtApp()
  
  ;($pinia as Pinia).use(createPersistedState({
    storage: {
      getItem: (key: string): string | null => {
        if (process.client) {
          return localStorage.getItem(key)
        }
        return null
      },
      setItem: (key: string, value: string): void => {
        if (process.client) {
          localStorage.setItem(key, value)
        }
      }
    } as any
  }))
})

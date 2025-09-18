import { createPersistedState } from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin(() => {
  const { $pinia } = useNuxtApp()
  
  $pinia.use(createPersistedState({
    storage: {
      getItem: (key: string) => {
        if (process.client) {
          return localStorage.getItem(key)
        }
        return null
      },
      setItem: (key: string, value: string) => {
        if (process.client) {
          localStorage.setItem(key, value)
        }
      },
      removeItem: (key: string) => {
        if (process.client) {
          localStorage.removeItem(key)
        }
      }
    }
  }))
})

import { defineNuxtPlugin } from 'nuxt/app'
import type { NuxtApp } from 'nuxt/app'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error: any) => {
    console.error('Vue error:', error)
    const toast: any = (nuxtApp as any).$toast
    if (toast && typeof toast.error === 'function') {
      try { toast.error('An unexpected error occurred. Please try again later.', { duration: 5000 }) } catch {}
    }
  }

  nuxtApp.hook('vue:error', (error) => {
    console.error('Vue error:', error)
  })

  nuxtApp.hook('app:error', (error) => {
    console.error('App error:', error)
  })
})
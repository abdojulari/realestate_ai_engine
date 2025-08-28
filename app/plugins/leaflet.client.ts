import { defineNuxtPlugin } from 'nuxt/app'
import type { NuxtApp } from 'nuxt/app'

export default defineNuxtPlugin(async (nuxtApp: NuxtApp) => {
  if (!process.client) return

  // Ensure leaflet styles are present on client
  await import('leaflet/dist/leaflet.css')
  await import('leaflet')

  const leafletVue = await import('@vue-leaflet/vue-leaflet')
  nuxtApp.vueApp.component('l-map', leafletVue.LMap)
  nuxtApp.vueApp.component('l-tile-layer', leafletVue.LTileLayer)
  nuxtApp.vueApp.component('l-marker', leafletVue.LMarker)
  nuxtApp.vueApp.component('l-icon', leafletVue.LIcon)
  nuxtApp.vueApp.component('l-popup', leafletVue.LPopup)
  nuxtApp.vueApp.component('l-control', leafletVue.LControl)
  nuxtApp.vueApp.component('l-circle', leafletVue.LCircle)
})
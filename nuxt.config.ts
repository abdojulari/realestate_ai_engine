// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  devtools: { enabled: true },
  srcDir: 'app',
  css: ['leaflet/dist/leaflet.css'],
  build: {
    transpile: ['leaflet', '@vue-leaflet/vue-leaflet', 'vuetify', 'vue-echarts', 'echarts']
  },
  vite: {
    optimizeDeps: {
      include: ['echarts', 'vue-echarts']
    }
  },
  
  typescript: {
    strict: true,
    typeCheck: false,
  },
  components: [
    { path: '../components', pathPrefix: false },
    { path: 'components', pathPrefix: false }
  ],
  imports: {
    dirs: ['../composables/**', '../utils/**', 'composables/**', 'utils/**'],
  },
  modules: [
    '@nuxtjs/tailwindcss',
    'vuetify-nuxt-module',
    '@pinia/nuxt',
  ],
  // @ts-ignore - module augments config
  vuetify: ({
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      /* vuetify options */
    },
  } as any),
  app: {
    head: {
      title: 'Real Estate',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api',
    },
    smtpUsername: process.env.SMTP_USERNAME,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpHostname: process.env.SMTP_HOSTNAME,
    smtpPort: process.env.SMTP_PORT,
    smtpSender: process.env.SMTP_SENDER,
  },
  alias: {
    '~': '/Users/abdul.ojulari/Frontends/suhani/app',
    '@': '/Users/abdul.ojulari/Frontends/suhani/app'
  }
})
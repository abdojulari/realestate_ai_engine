// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  devtools: { enabled: true },
  nitro: {
    preset: 'netlify',
  },
  srcDir: 'app',
  css: ['leaflet/dist/leaflet.css', '@mdi/font/css/materialdesignicons.css'],
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
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      ssr: true,
      defaults: {
        global: {
          ripple: false,
        },
        VBtn: {
          color: 'primary',
          variant: 'flat',
        },
        VCard: {
          flat: true,
        },
      },
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#1976D2',
              secondary: '#424242',
              accent: '#82B1FF',
              error: '#FF5252',
              info: '#2196F3',
              success: '#4CAF50',
              warning: '#FB8C00',
            },
          },
        },
      },
    },
  } as any,
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
    agentEmail: process.env.AGENT_EMAIL || 'real4ojulari@gmail.com',
    opencageApiKey: process.env.OPENCAGE_API_KEY,
  },
  alias: {
    '~': '/Users/abdul.ojulari/Frontends/suhani/app',
    '@': '/Users/abdul.ojulari/Frontends/suhani/app'
  }
})
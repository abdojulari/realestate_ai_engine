// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-12-29',
  devtools: { enabled: true },
  // Server-side rendering for VPS deployment
  srcDir: 'app',
  hooks: {
    'build:done': async () => {
      const fs = await import('fs/promises')
      const path = await import('path')
      const precomputedPath = path.join(process.cwd(), '.nuxt', 'dist', 'server', 'client.precomputed.mjs')
      try {
        await fs.writeFile(precomputedPath, 'export default {}')
      } catch (e) {
        console.log('Could not create client.precomputed.mjs:', e)
      }
    }
  },
  css: [
    '~/assets/css/main.css',
    'leaflet/dist/leaflet.css', 
    '@mdi/font/css/materialdesignicons.css'
  ],
  build: {
    transpile: ['leaflet', '@vue-leaflet/vue-leaflet', 'vuetify', 'vue-echarts', 'echarts']
  },
  routeRules: {
    '/admin/documents': { ssr: false },
  },
  nitro: {
    // Prevent 413 Payload Too Large on POST requests (default limit can be low)
    bodyLimit: '50mb',
  } as any,
  vite: {
    optimizeDeps: {
      include: [
        'echarts',
        'vue-echarts',
        'pdf-lib',
        'pdfjs-dist',
        'mammoth',
        'signature_pad',
        'tesseract.js',
      ],
    },
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
    '@nuxtjs/google-fonts',
  ],
  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      'Dancing Script': [600], // For signature font
    },
    display: 'swap',
    download: true, // This downloads fonts to your server for better performance
  },
  // @ts-expect-error vuetify-nuxt-module adds this config key
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      ssr: true,
      defaults: {
        global: {
          ripple: false,
          font: {
            family: 'Inter, sans-serif',
          }
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
      script: [
        {
          src: 'https://connect.facebook.net/en_US/sdk.js',
          async: true,
          defer: true
        }
      ]
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      facebookAppId: process.env.FACEBOOK_APP_ID,
    },
    smtpUsername: process.env.SMTP_USERNAME || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    smtpHostname: process.env.SMTP_HOSTNAME || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSender: process.env.SMTP_SENDER || 'noreply@homebyabdul.com',
    agentEmail: process.env.AGENT_EMAIL || 'real4ojulari@gmail.com',
    opencageApiKey: process.env.OPENCAGE_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqApiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    alertSchedulerSecret: process.env.ALERT_SCHEDULER_SECRET || process.env.CRON_SECRET || 'change-me-in-production',
    // Pillar9/Matrix API Configuration
    pillar9ClientId: process.env.PILLAR9_CLIENT_ID || '',
    pillar9ClientSecret: process.env.PILLAR9_CLIENT_SECRET || '',
    pillar9TokenHost: process.env.PILLAR9_TOKEN_HOST || 'pillarnine.clareityiam.net',
    pillar9ApiHost: process.env.PILLAR9_API_HOST || 'abrls.matrixwebapi.com',
    /** Secret for cron/unauthenticated sync (e.g. PILLAR9_SYNC_SECRET or CRON_SECRET). If set, POST with X-Pillar9-Sync-Key or Bearer token bypasses admin auth. */
    pillar9SyncSecret: process.env.PILLAR9_SYNC_SECRET || process.env.CRON_SECRET || '',
  },
  alias: {
    '~': '/Users/abdul.ojulari/Frontends/suhani/app',
    '@': '/Users/abdul.ojulari/Frontends/suhani/app'
  }
})
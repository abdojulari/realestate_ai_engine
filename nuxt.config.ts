// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
const axiosRetryShim = fileURLToPath(new URL('./server/shims/axios-retry.cjs', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-12-29',
  devtools: { enabled: true },
  // Cuts Docker/CI memory during `nuxt build` (large SSR bundle); re-enable if you need prod sourcemaps.
  sourcemap: {
    server: false,
    client: false,
  },
  // Server-side rendering for VPS deployment
  srcDir: 'app',
  hooks: {
    'build:done': async () => {
      const fs = await import('fs/promises')
      const path = await import('path')
      const precomputedPath = path.join(process.cwd(), '.nuxt', 'dist', 'server', 'client.precomputed.mjs')
      try {
        await fs.mkdir(path.dirname(precomputedPath), { recursive: true })
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
    transpile: [
      'leaflet',
      '@vue-leaflet/vue-leaflet',
      'vuetify',
      'vue-echarts',
      'echarts',
      'react',
      'react-dom',
      '@excalidraw/excalidraw',
    ],
  },
  routeRules: {
    '/admin/documents': { ssr: false },
    '/admin/tools': { ssr: false },
    '/admin/tools/**': { ssr: false },
  },
  nitro: {
    // 50 MB — prevent 413 Payload Too Large on document/resource uploads
    bodyLimit: 50 * 1024 * 1024,
    // @verdocs/js-sdk + axios-retry v4 CJS interop breaks when bundled; shim loads real export
    alias: {
      'axios-retry': axiosRetryShim,
    },
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
        'react',
        'react-dom',
        '@excalidraw/excalidraw',
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
          innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MMZ7NH2F');`,
          type: 'text/javascript',
          tagPosition: 'head',
        },
        {
          src: 'https://connect.facebook.net/en_US/sdk.js',
          async: true,
          defer: true
        },
        {
          src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
          async: true,
          defer: true
        }
      ],
      noscript: [
        {
          innerHTML: '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MMZ7NH2F" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
          tagPosition: 'bodyOpen',
        }
      ]
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api',
      // Empty defaults: overridden at runtime by NUXT_PUBLIC_* (required for Docker — values are not available at `nuxt build` unless passed as build-args).
      siteUrl: '',
      facebookAppId: process.env.FACEBOOK_APP_ID,
      /** Cloudflare Turnstile site key (client). Set `NUXT_PUBLIC_SITE_KEY` in env — maps to `siteKey` per Nuxt. */
      siteKey: '',
      geoapifyApiKey: process.env.GEOAPIFY_API_KEY || process.env.VITE_GEOAPIFY || '',
      /** Google Analytics Measurement ID (e.g. G-XXXXXXXXXX). Set NUXT_PUBLIC_GTAG_ID in env. */
      gtagId: '',
    },
    // Private — not exposed to client. Set `NUXT_TURNSTILE_SECRET_KEY` in env (Docker compose maps legacy file keys into this).
    turnstileSecretKey: '',
    turnstileVerifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
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
    pillar9ApiHost: process.env.PILLAR9_API_HOST || 'abrls.matrixwebapi.com',
    /** Secret for cron/unauthenticated sync (e.g. PILLAR9_SYNC_SECRET or CRON_SECRET). If set, POST with X-Pillar9-Sync-Key or Bearer token bypasses admin auth. */
    pillar9SyncSecret: process.env.PILLAR9_SYNC_SECRET || process.env.CRON_SECRET || '',
    verdocsClientId: process.env.VERDOCS_CLIENT_ID || '',
    verdocsClientSecret: process.env.VERDOCS_CLIENT_SECRET || '',
    verdocsApiBase: process.env.VERDOCS_API_BASE || 'https://api.verdocs.com',
    /** Full OAuth token URL; falls back to VERDOCS_API_URL in .env (legacy) or apiBase/oauth/token */
    verdocsTokenUrl:
      process.env.VERDOCS_TOKEN_URL || process.env.VERDOCS_API_URL || '',
  },
  alias: {
    '~': fileURLToPath(new URL('./app', import.meta.url)),
    '@': fileURLToPath(new URL('./app', import.meta.url)),
  }
})
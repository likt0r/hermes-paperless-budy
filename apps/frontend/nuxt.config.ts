// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/icon'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      /** Motia / iii stream WebSocket URL (see apps/service iii-config STREAMS_PORT default 3112) */
      streamWsUrl: process.env.NUXT_PUBLIC_STREAM_WS_URL || 'ws://localhost:3112'
    }
  },

  routeRules: {
    '/': { prerender: true },
    '/api/**': { proxy: 'http://localhost:3111/**' }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3111',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, '')
      } as Record<string, unknown>
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 256
    }
  }
})

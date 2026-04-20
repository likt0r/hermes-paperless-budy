// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/icon'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    redisUrl: 'redis://localhost:6379',
    doclingUrl: 'http://localhost:5001',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'ministral-3:8b',
    ollamaTemperature: '0.15',
    paperlessUrl: '',
    paperlessToken: '',
    public: {
      paperlessBaseUrl: 'http://localhost:8000',
    },
  },

  routeRules: {
    '/': { redirect: '/analyze' },
    '/socket.io/**': { ssr: false },
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
    },
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
    },
  },
})

<script setup>
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
})

const title = 'Hermes Document Parser'
const description = 'Upload PDFs and extract text via OCR. Test the parse document step.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary',
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="font-bold">Hermes Document Parser</span>
        </NuxtLink>
      </template>

      <template #right>
        <nav class="flex items-center gap-2" aria-label="Header actions">
          <ClientOnly>
            <UColorModeButton />
            <template #fallback>
              <div class="size-8" />
            </template>
          </ClientOnly>
        </nav>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="i-lucide-file-text" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">Hermes Document Parser • © {{ new Date().getFullYear() }}</p>
      </template>

      <template #right>
        <span class="text-sm text-muted">Nuxt UI</span>
      </template>
    </UFooter>
  </UApp>
</template>

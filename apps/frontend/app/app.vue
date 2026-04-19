<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Hermes Document Parser'
const description = 'Upload PDFs and extract text via OCR. Test the parse document step.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary'
})

const { items } = useAppNavigation()
</script>

<template>
  <UApp>
    <UDashboardGroup>
      <UDashboardSidebar
        id="app-sidebar"
        collapsible
        resizable
        :min-size="16"
        :default-size="20"
        :max-size="28"
      >
        <template #header>
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-semibold"
          >
            <UIcon
              name="i-lucide-file-text"
              class="size-5 text-primary"
            />
            <span>Hermes</span>
          </NuxtLink>
        </template>

        <template #default>
          <UNavigationMenu
            :items="items"
            orientation="vertical"
            class="w-full"
          />
        </template>

        <template #footer>
          <ClientOnly>
            <UColorModeButton />
            <template #fallback>
              <div class="size-8" />
            </template>
          </ClientOnly>
          <span class="text-xs text-muted ml-2">
            © {{ new Date().getFullYear() }}
          </span>
        </template>
      </UDashboardSidebar>

      <NuxtPage />
    </UDashboardGroup>
  </UApp>
</template>

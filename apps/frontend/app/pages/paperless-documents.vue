<script setup lang="ts">
definePageMeta({ ssr: false })
useHead({ title: 'Paperless Documents' })

const { query, data, pending, error, refresh } = usePaperlessDocuments()

const searchInput = ref(query.query)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    query.query = value
    query.page = 1
  }, 300)
})

const totalPages = computed(() => {
  if (!data.value) return 1
  return Math.max(1, Math.ceil(data.value.count / data.value.pageSize))
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  query.page = page
}

const orderingOptions = [
  { label: 'Newest first', value: '-created' },
  { label: 'Oldest first', value: 'created' },
  { label: 'Recently modified', value: '-modified' },
  { label: 'Title A–Z', value: 'title' },
  { label: 'Title Z–A', value: '-title' },
]

const errorMessage = computed(() => {
  if (!error.value) return null
  type FetchLike = { data?: { error?: string }; message?: string; statusCode?: number }
  const err = error.value as FetchLike
  return err?.data?.error ?? err?.message ?? 'Failed to load Paperless documents'
})
</script>

<template>
  <UDashboardPanel id="paperless-documents">
    <template #header>
      <UDashboardNavbar title="Paperless Documents" icon="i-lucide-library">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="pending" @click="refresh()">
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
      <div class="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 border-t border-(--ui-border)">
        <UInput
          v-model="searchInput"
          placeholder="Search documents…"
          icon="i-lucide-search"
          class="flex-1 min-w-60"
        />
        <USelect
          v-model="query.ordering"
          :items="orderingOptions"
          value-key="value"
          class="w-56"
        />
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="errorMessage"
          color="error"
          :title="errorMessage"
          icon="i-lucide-alert-circle"
          :actions="[{ label: 'Retry', color: 'primary', onClick: () => refresh() }]"
        />

        <div v-if="pending && !data" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <USkeleton v-for="n in 6" :key="n" class="h-64 w-full" />
        </div>

        <div v-else-if="data && data.results.length === 0" class="py-16 text-center space-y-2">
          <UIcon name="i-lucide-inbox" class="size-10 text-muted mx-auto" />
          <p class="text-muted">No documents found.</p>
        </div>

        <div v-else-if="data" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <PaperlessDocumentCard v-for="doc in data.results" :key="doc.id" :document="doc" />
        </div>

        <div v-if="data && data.count > data.pageSize" class="flex items-center justify-between pt-2">
          <p class="text-sm text-muted">Page {{ data.page }} of {{ totalPages }} · {{ data.count }} documents</p>
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="soft"
              :disabled="data.page <= 1 || pending"
              @click="goToPage(data.page - 1)"
            >
              Previous
            </UButton>
            <UButton
              trailing-icon="i-lucide-chevron-right"
              color="neutral"
              variant="soft"
              :disabled="data.page >= totalPages || pending"
              @click="goToPage(data.page + 1)"
            >
              Next
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

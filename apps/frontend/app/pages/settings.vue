<script setup lang="ts">
definePageMeta({ ssr: false })
useHead({ title: 'Settings' })

const confirming = ref(false)
const pending = ref(false)
const result = ref<{ count: number } | null>(null)
const error = ref<string | null>(null)

async function startReanalysis() {
  pending.value = true
  error.value = null
  result.value = null
  try {
    const data = await $fetch<{ count: number }>('/api/analyze/all', { method: 'POST' })
    result.value = data
    confirming.value = false
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    error.value = e.data?.statusMessage ?? e.message ?? 'Unknown error'
    confirming.value = false
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings" icon="i-lucide-settings" />
    </template>

    <template #body>
      <div class="max-w-2xl space-y-8">
        <div class="space-y-4">
          <div>
            <h2 class="text-base font-semibold">Paperless</h2>
            <p class="text-sm text-muted mt-1">
              Trigger AI metadata extraction for all documents in your Paperless instance.
              Each document will be queued for processing and progress can be tracked on the Jobs page.
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <div v-if="!confirming" class="flex">
              <UButton
                icon="i-lucide-refresh-cw"
                color="primary"
                @click="confirming = true"
              >
                Reanalyze All Documents
              </UButton>
            </div>

            <template v-else>
              <UAlert
                color="warning"
                icon="i-lucide-triangle-alert"
                title="Are you sure?"
                description="This will queue every document in Paperless for full reanalysis. Existing metadata will be overwritten. This may take a long time depending on the number of documents."
              />
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-play"
                  color="error"
                  :loading="pending"
                  @click="startReanalysis()"
                >
                  Confirm – Start Reanalysis
                </UButton>
                <UButton
                  color="neutral"
                  variant="ghost"
                  :disabled="pending"
                  @click="confirming = false"
                >
                  Cancel
                </UButton>
              </div>
            </template>

            <UAlert
              v-if="result"
              color="success"
              icon="i-lucide-check-circle"
              :title="`Queued ${result.count} document${result.count === 1 ? '' : 's'} for reanalysis`"
              description="Track progress on the Jobs page."
            />

            <UAlert
              v-if="error"
              color="error"
              icon="i-lucide-alert-circle"
              title="Failed to start reanalysis"
              :description="error"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

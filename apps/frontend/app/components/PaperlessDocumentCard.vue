<script setup lang="ts">
import type { PaperlessDocumentSummary } from '~/composables/usePaperlessDocuments'

const props = defineProps<{
  document: PaperlessDocumentSummary
}>()

const jobId = ref<string | null>(null)
const triggering = ref(false)
const actionError = ref<string | null>(null)

const { status, metadata, error: streamError } = useExtractionStream(jobId)

const isProcessing = computed(() => {
  if (triggering.value) return true
  if (!jobId.value) return false
  return !['updated', 'error', 'done'].includes(status.value)
})

const statusLabel = computed(() => {
  if (triggering.value) return 'Starting…'
  if (!jobId.value) return null
  switch (status.value) {
    case 'parsed':
      return 'Queued…'
    case 'summarizing':
      return 'Building summary…'
    case 'summarized':
      return 'Summary ready, extracting metadata…'
    case 'extracting':
      return 'Extracting metadata…'
    case 'updating':
      return 'Updating Paperless document…'
    case 'updated':
      return 'Paperless document updated'
    case 'error':
      return 'Update failed'
    default:
      return 'Processing…'
  }
})

const statusColor = computed<'primary' | 'success' | 'error' | 'neutral'>(() => {
  if (!jobId.value) return 'neutral'
  if (status.value === 'updated') return 'success'
  if (status.value === 'error') return 'error'
  return 'primary'
})

const formattedCreated = computed(() => {
  try {
    return new Date(props.document.created).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return props.document.created
  }
})

async function updateInformation() {
  if (isProcessing.value) return
  triggering.value = true
  actionError.value = null

  try {
    const res = await fetch('/service/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: props.document.id })
    })
    const data = (await res.json().catch(() => ({}))) as { jobId?: string, error?: string }

    if (!res.ok) {
      actionError.value = data.error ?? `Request failed (${res.status})`
      return
    }

    jobId.value = data.jobId ?? null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Network error contacting service'
  } finally {
    triggering.value = false
  }
}
</script>

<template>
  <UCard class="h-full flex flex-col">
    <template #header>
      <div class="flex items-start gap-3 min-w-0">
        <UIcon
          name="i-lucide-file-text"
          class="size-5 text-primary mt-0.5 shrink-0"
        />
        <div class="min-w-0 flex-1">
          <h3
            class="font-semibold truncate"
            :title="document.title"
          >
            {{ document.title }}
          </h3>
          <p class="text-xs text-muted truncate">
            #{{ document.id }} · {{ document.originalFileName }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4 flex-1">
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p class="text-muted uppercase tracking-wider mb-1">
            Created
          </p>
          <p>{{ formattedCreated }}</p>
        </div>
        <div v-if="document.pageCount !== null">
          <p class="text-muted uppercase tracking-wider mb-1">
            Pages
          </p>
          <p>{{ document.pageCount }}</p>
        </div>
      </div>

      <div
        v-if="document.correspondent || document.documentType"
        class="space-y-2"
      >
        <div v-if="document.documentType">
          <p class="text-xs text-muted uppercase tracking-wider mb-1">
            Type
          </p>
          <UBadge
            color="primary"
            variant="subtle"
            size="sm"
          >
            {{ document.documentType.name }}
          </UBadge>
        </div>
        <div v-if="document.correspondent">
          <p class="text-xs text-muted uppercase tracking-wider mb-1">
            Correspondent
          </p>
          <div class="flex items-center gap-2 text-sm">
            <UIcon
              name="i-lucide-user"
              class="size-4"
            />
            <span class="truncate">{{ document.correspondent.name }}</span>
          </div>
        </div>
      </div>

      <div v-if="document.tags.length">
        <p class="text-xs text-muted uppercase tracking-wider mb-2">
          Tags
        </p>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in document.tags"
            :key="tag.id"
            color="neutral"
            variant="outline"
            size="sm"
          >
            {{ tag.name }}
          </UBadge>
        </div>
      </div>

      <div v-if="document.contentPreview">
        <p class="text-xs text-muted uppercase tracking-wider mb-1">
          Preview
        </p>
        <p class="text-xs text-muted line-clamp-3">
          {{ document.contentPreview }}
        </p>
      </div>

      <div
        v-if="metadata && status === 'updated'"
        class="pt-2 border-t border-default space-y-1"
      >
        <p class="text-xs text-muted uppercase tracking-wider">
          AI updated
        </p>
        <p
          v-if="metadata.title"
          class="text-sm font-medium truncate"
        >
          {{ metadata.title }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in metadata.tags"
            :key="tag"
            color="success"
            variant="subtle"
            size="sm"
          >
            {{ tag }}
          </UBadge>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-2 w-full">
        <div
          v-if="statusLabel"
          class="flex items-center gap-2 text-xs"
        >
          <UIcon
            v-if="isProcessing"
            name="i-lucide-loader-circle"
            class="size-3.5 animate-spin"
            :class="`text-${statusColor}`"
          />
          <UIcon
            v-else-if="status === 'updated'"
            name="i-lucide-check-circle-2"
            class="size-3.5 text-success"
          />
          <UIcon
            v-else-if="status === 'error'"
            name="i-lucide-alert-circle"
            class="size-3.5 text-error"
          />
          <span :class="`text-${statusColor}`">{{ statusLabel }}</span>
        </div>

        <UAlert
          v-if="actionError"
          color="error"
          :title="actionError"
          size="sm"
          icon="i-lucide-alert-circle"
        />
        <UAlert
          v-else-if="streamError"
          color="error"
          :title="streamError"
          size="sm"
          icon="i-lucide-alert-circle"
        />

        <UButton
          block
          icon="i-lucide-sparkles"
          color="primary"
          :loading="isProcessing"
          :disabled="isProcessing"
          @click="updateInformation"
        >
          {{ status === 'updated' ? 'Run again' : 'Update information' }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>

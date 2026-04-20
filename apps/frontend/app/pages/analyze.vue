<script setup lang="ts">
useHead({ title: 'Analyze Single Document' })

const selectedFile = ref<File | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<string | null>(null)
const jobId = ref<string | null>(null)

const { status: extractionStatus, metadata: extractionMetadata, summary: extractionSummary, error: extractionError } = useJobStatus(jobId)

const extractionStatusLabel = computed(() => {
  switch (extractionStatus.value) {
    case 'summarizing':
      return 'Building summary…'
    case 'summarized':
      return 'Summary ready, extracting metadata…'
    case 'extracting':
      return 'Extracting metadata…'
    case 'updating':
      return 'Updating Paperless document…'
    case 'updated':
      return 'Paperless document updated.'
    default:
      return 'Processing…'
  }
})

const PARSE_TIMEOUT_MS = 120_000

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      resolve(base64 ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function onFileSelected() {
  error.value = null
  if (result.value !== null) {
    result.value = null
    jobId.value = null
  }
}

async function parsePdf() {
  const file = selectedFile.value
  if (!file) return

  loading.value = true
  error.value = null
  result.value = null
  jobId.value = null

  try {
    const base64 = await fileToBase64(file)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS)

    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf: base64 }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const data = (await res.json().catch(() => ({}))) as {
      markdown?: string
      jobId?: string
      error?: string
    }

    if (!res.ok) {
      error.value = data.error ?? `Request failed (${res.status})`
      return
    }

    result.value = data.markdown ?? ''
    jobId.value = data.jobId ?? null
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        error.value = 'Request timed out. Try a smaller document or try again.'
      } else {
        error.value = e.message
      }
    } else {
      error.value = 'Network or server error.'
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  selectedFile.value = null
  result.value = null
  jobId.value = null
  error.value = null
}

async function copyResult() {
  if (result.value === null) return
  try {
    await navigator.clipboard.writeText(result.value)
  } catch {
    error.value = 'Failed to copy to clipboard'
  }
}
</script>

<template>
  <UDashboardPanel id="analyze">
    <template #header>
      <UDashboardNavbar
        title="Analyze Single Document"
        icon="i-lucide-scan-text"
      />
    </template>

    <template #body>
      <div class="space-y-6 max-w-4xl">
        <UAlert
          v-if="error"
          color="error"
          :title="error"
          icon="i-lucide-alert-circle"
          :actions="[
            {
              label: 'Dismiss',
              onClick: () => {
                error = null
              }
            },
            {
              label: 'Try again',
              color: 'primary',
              onClick: () => {
                error = null
                parsePdf()
              }
            }
          ]"
        />

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-file-up"
                class="size-5"
              />
              <span>Upload PDF</span>
            </div>
          </template>

          <UFileUpload
            v-model="selectedFile"
            accept="application/pdf"
            label="Drop your PDF here or click to browse"
            description="Single PDF file. OCR may take up to a minute for large documents."
            icon="i-lucide-file-text"
            :disabled="loading"
            class="min-h-40"
            @update:model-value="onFileSelected"
          />

          <template #footer>
            <div class="flex flex-wrap gap-2">
              <UButton
                :disabled="!selectedFile || loading"
                :loading="loading"
                icon="i-lucide-scan-text"
                @click="parsePdf"
              >
                {{ loading ? 'Parsing…' : 'Parse document' }}
              </UButton>
              <UButton
                v-if="result !== null"
                color="neutral"
                variant="ghost"
                icon="i-lucide-rotate-ccw"
                @click="reset"
              >
                Parse another
              </UButton>
            </div>
          </template>
        </UCard>

        <UCard
          v-if="loading"
          class="border-primary-500/30 border-2 border-dashed"
        >
          <div class="flex flex-col items-center justify-center gap-4 py-8">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-10 text-primary animate-spin"
            />
            <p class="text-muted text-center">
              Parsing document… This may take a minute for large PDFs.
            </p>
          </div>
        </UCard>

        <UCard
          v-if="extractionStatus && !['parsed', 'done', 'updated', 'error'].includes(extractionStatus)"
          class="border-primary-500/30 border-2 border-dashed"
        >
          <div class="flex flex-col items-center justify-center gap-4 py-6">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-8 text-primary animate-spin"
            />
            <p class="text-muted text-center">
              {{ extractionStatusLabel }}
            </p>
          </div>
        </UCard>

        <UAlert
          v-if="extractionError"
          color="error"
          :title="extractionError"
          icon="i-lucide-alert-circle"
        />

        <UCard v-if="extractionSummary">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-file-text"
                class="size-5"
              />
              <span>Document summary</span>
            </div>
          </template>
          <p class="text-sm leading-relaxed">
            {{ extractionSummary }}
          </p>
        </UCard>

        <UCard v-if="extractionMetadata">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-tags"
                class="size-5"
              />
              <span>Extracted metadata</span>
            </div>
          </template>
          <div class="space-y-4">
            <div v-if="extractionMetadata.title">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Title
              </p>
              <p class="font-medium">
                {{ extractionMetadata.title }}
              </p>
            </div>
            <div v-if="extractionMetadata.summary">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Summary
              </p>
              <p class="text-sm">
                {{ extractionMetadata.summary }}
              </p>
            </div>
            <div v-if="extractionMetadata.documentType">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Document type
              </p>
              <UBadge
                color="primary"
                variant="subtle"
                size="sm"
              >
                {{ extractionMetadata.documentType }}
              </UBadge>
            </div>
            <div v-if="extractionMetadata.correspondent">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Correspondent
              </p>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-user"
                  class="size-4"
                />
                <span>{{ extractionMetadata.correspondent }}</span>
              </div>
            </div>
            <div v-if="extractionMetadata.documentDate">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Document date
              </p>
              <span>{{ formatDate(extractionMetadata.documentDate) }}</span>
            </div>
            <div v-if="extractionMetadata.language">
              <p class="text-xs text-muted uppercase tracking-wider mb-1">
                Language
              </p>
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ extractionMetadata.language }}
              </UBadge>
            </div>
            <div v-if="extractionMetadata.tags?.length">
              <p class="text-xs text-muted uppercase tracking-wider mb-2">
                Tags
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in extractionMetadata.tags"
                  :key="tag"
                  color="neutral"
                  variant="outline"
                  size="sm"
                >
                  {{ tag }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <UCard v-if="result !== null && !loading">
          <template #header>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-file-output"
                  class="size-5"
                />
                <span>Extracted text</span>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-copy"
                @click="copyResult"
              >
                Copy
              </UButton>
            </div>
          </template>
          <pre
            class="p-4 rounded-lg bg-muted/50 text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap break-words font-sans"
          >{{ result || '(empty)' }}</pre>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

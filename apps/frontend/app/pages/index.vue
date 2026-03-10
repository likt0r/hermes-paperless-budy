<template>
  <UContainer>
    <UPage>
      <UPageHeader
        title="Document Parser"
        description="Upload a PDF and extract its text via OCR."
        icon="i-lucide-scan-text"
      />

      <UPageBody>
        <div class="space-y-6">
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
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const selectedFile = ref<File | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<string | null>(null)

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

function onFileSelected() {
  error.value = null
  if (result.value !== null) {
    result.value = null
  }
}

async function parsePdf() {
  const file = selectedFile.value
  if (!file) return

  loading.value = true
  error.value = null
  result.value = null

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

    const data = (await res.json().catch(() => ({}))) as { markdown?: string, error?: string }

    if (!res.ok) {
      error.value = data.error ?? `Request failed (${res.status})`
      return
    }

    result.value = data.markdown ?? ''
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        error.value = 'Request timed out. Try a smaller document or try again.'
      } else {
        error.value = e.message
      }
    } else {
      error.value = 'Network or server error. Ensure the backend is running on port 3111.'
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  selectedFile.value = null
  result.value = null
  error.value = null
}

async function copyResult() {
  if (result.value === null) return
  try {
    await navigator.clipboard.writeText(result.value)
    // Optional: show a brief toast; Nuxt UI may have useToast
  } catch {
    error.value = 'Failed to copy to clipboard'
  }
}
</script>

import { Stream } from '@motiadev/stream-client-browser'
import type { Ref } from 'vue'

export type ExtractionStatus = 'parsed' | 'summarizing' | 'summarized' | 'extracting' | 'done' | 'updating' | 'updated' | 'error'

export type ExtractionMetadata = {
  title: string | null
  summary: string | null
  tags: string[]
  documentType: string | null
  correspondent: string | null
  documentDate: string | null
  language: string | null
}

export type ExtractionState = {
  status: ExtractionStatus
  error?: string
  summary?: string
  metadata?: ExtractionMetadata
}

type Subscription = {
  close: () => void
  getState: () => ExtractionState | null
  addChangeListener: (cb: (state: ExtractionState | null) => void) => void
}

export function useExtractionStream(jobId: Ref<string | null> | string) {
  const config = useRuntimeConfig()
  const streamWsUrl = computed(() => String(config.public.streamWsUrl ?? 'ws://localhost:3112'))

  const status = ref<ExtractionStatus>('parsed')
  const metadata = ref<ExtractionMetadata | null>(null)
  const summary = ref<string | null>(null)
  const streamError = ref<string | null>(null)

  let stream: InstanceType<typeof Stream> | null = null
  let subscription: Subscription | null = null

  function applyState(state: ExtractionState | null) {
    if (!state) return
    status.value = state.status as ExtractionStatus
    streamError.value = state.error ?? null
    summary.value = state.summary ?? null
    metadata.value = state.metadata ?? null
  }

  function subscribe(id: string) {
    if (import.meta.server) return
    const url = streamWsUrl.value
    if (!url) return

    stream = new Stream(url)
    subscription = stream.subscribeItem('extraction', 'jobs', id) as Subscription
    subscription.addChangeListener(applyState)
    applyState(subscription.getState())
  }

  function unsubscribe() {
    subscription?.close()
    stream?.close()
    subscription = null
    stream = null
  }

  watch(
    () => ({
      id: typeof jobId === 'string' ? jobId : jobId?.value ?? null,
      url: streamWsUrl.value
    }),
    ({ id }) => {
      unsubscribe()
      if (id) {
        status.value = 'parsed'
        streamError.value = null
        summary.value = null
        metadata.value = null
        subscribe(id)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => unsubscribe())

  return { status, metadata, summary, error: streamError }
}

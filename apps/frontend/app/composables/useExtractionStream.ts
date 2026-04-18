import { Stream } from '@motiadev/stream-client'
import type { Ref } from 'vue'

export type ExtractionStatus = 'parsed' | 'summarizing' | 'summarized' | 'extracting' | 'done' | 'error'

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

function getStreamWsUrl(): string {
  if (import.meta.server) return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function createBrowserSocketAdapter(): import('@motiadev/stream-client').SocketAdapter {
  const wsUrl = getStreamWsUrl()
  let ws: WebSocket | null = null
  let messageCb: ((message: string) => void) | null = null
  let openCb: (() => void) | null = null
  let closeCb: (() => void) | null = null

  return {
    connect() {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => messageCb?.(event.data as string)
      ws.onopen = () => openCb?.()
      ws.onclose = () => closeCb?.()
    },
    close() {
      ws?.close()
      ws = null
    },
    send(message: string) {
      ws?.readyState === WebSocket.OPEN && ws.send(message)
    },
    isOpen() {
      return ws?.readyState === WebSocket.OPEN ?? false
    },
    onMessage(callback: (message: string) => void) {
      messageCb = callback
    },
    onOpen(callback: () => void) {
      openCb = callback
    },
    onClose(callback: () => void) {
      closeCb = callback
    }
  }
}

export function useExtractionStream(jobId: Ref<string | null> | string) {
  const status = ref<ExtractionStatus>('parsed')
  const metadata = ref<ExtractionMetadata | null>(null)
  const streamError = ref<string | null>(null)

  let stream: InstanceType<typeof Stream> | null = null
  let subscription: { close: () => void; addChangeListener: (cb: (state: ExtractionState | null) => void) => void } | null = null

  function subscribe(id: string) {
    if (import.meta.server) return
    const adapterFactory = createBrowserSocketAdapter
    stream = new Stream(adapterFactory)
    subscription = stream.subscribeItem('extraction', 'jobs', id) as typeof subscription
    subscription.addChangeListener((state) => {
      if (state) {
        status.value = state.status as ExtractionStatus
        streamError.value = state.error ?? null
        metadata.value = state.metadata ?? null
      }
    })
  }

  function unsubscribe() {
    subscription?.close()
    stream?.close()
    subscription = null
    stream = null
  }

  watch(
    () => (typeof jobId === 'string' ? jobId : jobId?.value ?? null),
    (id) => {
      unsubscribe()
      if (id) {
        status.value = 'parsed'
        streamError.value = null
        metadata.value = null
        subscribe(id)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => unsubscribe())

  return { status, metadata, error: streamError }
}

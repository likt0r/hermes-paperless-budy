import type { Ref } from 'vue'
import type { JobState } from './useGlobalJobs'

export type JobStatus =
  | 'parsed'
  | 'summarizing'
  | 'summarized'
  | 'extracting'
  | 'done'
  | 'updating'
  | 'updated'
  | 'error'

export type JobMetadata = {
  title: string | null
  summary: string | null
  tags: string[]
  documentType: string | null
  correspondent: string | null
  documentDate: string | null
  language: string | null
}

export function useJobStatus(jobId: Ref<string | null> | string) {
  const globalJobs = useGlobalJobs()
  const id = computed(() => (typeof jobId === 'string' ? jobId : jobId?.value ?? null))

  const jobState = computed(() => id.value ? globalJobs.value[id.value] : null)

  const status = ref<JobStatus>('parsed')
  const metadata = ref<JobMetadata | null>(null)
  const summary = ref<string | null>(null)
  const error = ref<string | null>(null)

  watchEffect(() => {
    if (jobState.value) {
      if (jobState.value.status !== 'unknown') status.value = jobState.value.status as JobStatus
      if (jobState.value.metadata !== undefined) metadata.value = jobState.value.metadata
      if (jobState.value.summary !== undefined) summary.value = jobState.value.summary
      if (jobState.value.error !== undefined) error.value = jobState.value.error
    }
  })

  watch(id, (newId) => {
    if (!newId || import.meta.server) return
    if (!globalJobs.value[newId]) {
      const nuxtApp = useNuxtApp()
      const socket = nuxtApp.$socket as any
      if (socket) {
        socket.emit('get-initial-status', newId, (update: any) => {
          if (update && update.status !== 'unknown') {
            globalJobs.value[newId] = { jobId: newId, ...update }
          }
        })
      }
    }
  }, { immediate: true })

  return { status, metadata, summary, error }
}

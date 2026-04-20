import type { JobStatus, JobMetadata } from './useJobStatus'

export interface JobState {
  jobId: string
  paperlessDocumentId?: number
  status: JobStatus | 'unknown'
  summary?: string
  metadata?: JobMetadata
  error?: string
  timestamp?: number
}

export function useGlobalJobs() {
  return useState<Record<string, JobState>>('global-jobs', () => ({}))
}

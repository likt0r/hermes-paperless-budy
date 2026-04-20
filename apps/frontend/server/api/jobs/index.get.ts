import { getDocumentProcessingQueue } from '../../queues/document-processing'

export default defineEventHandler(async () => {
  const queue = getDocumentProcessingQueue()
  // Fetch active/waiting, plus up to 50 recent completed/failed jobs
  const activeJobs = await queue.getJobs(['active', 'waiting', 'delayed'])
  const completedJobs = await queue.getJobs(['completed', 'failed'], 0, 50, false)
  const jobs = [...activeJobs, ...completedJobs]

  const jobsData = await Promise.all(jobs.map(async job => {
    const progress = typeof job.progress === 'object' && job.progress !== null ? job.progress as any : {}
    const state = await job.getState()
    return {
      jobId: job.id,
      paperlessDocumentId: job.data.paperlessDocumentId,
      status: state === 'failed' ? 'error' : (progress.status ?? state),
      summary: progress.summary,
      metadata: progress.metadata,
      error: state === 'failed' ? (job.failedReason ?? progress.error) : progress.error,
      timestamp: job.timestamp
    }
  }))
  return jobsData
})

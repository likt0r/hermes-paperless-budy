import { io, type Socket } from 'socket.io-client'
import type { JobState } from '../composables/useGlobalJobs'

export default defineNuxtPlugin(async (nuxtApp) => {
  const jobs = useGlobalJobs()

  // Fetch initial active jobs
  try {
    const data = await $fetch<JobState[]>('/api/jobs')
    for (const job of data) {
      jobs.value[job.jobId] = job
    }
  } catch (err) {
    console.error('Failed to fetch initial jobs:', err)
  }

  // Socket connection
  const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] })

  // Listen for global job status updates
  socket.on('job:status', (update: JobState) => {
    if (!update.jobId) return

    // Update or merge the job state
    if (jobs.value[update.jobId]) {
      jobs.value[update.jobId] = { ...jobs.value[update.jobId], ...update }
    } else {
      jobs.value[update.jobId] = { timestamp: Date.now(), ...update }
    }
  })

  // Provide the socket to the rest of the app if needed
  return {
    provide: {
      socket
    }
  }
})

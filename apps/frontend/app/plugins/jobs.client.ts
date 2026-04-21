import type { JobState } from '../composables/useGlobalJobs'

export default defineNuxtPlugin(() => {
  const jobs = useGlobalJobs()

  const url = new URL('/_ws', window.location.href)
  url.protocol = url.protocol.replace('http', 'ws')
  const ws = new WebSocket(url.href)

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type !== 'job:status' || !msg.jobId) return
    const { type: _type, ...update } = msg as { type: string } & JobState
    jobs.value[update.jobId] = jobs.value[update.jobId]
      ? { ...jobs.value[update.jobId], ...update }
      : { timestamp: Date.now(), ...update }
  }

  // Non-blocking — does not delay page render
  $fetch<JobState[]>('/api/jobs')
    .then((data) => { for (const job of data) jobs.value[job.jobId] = job })
    .catch((err) => console.error('Failed to fetch initial jobs:', err))

  return {
    provide: { ws }
  }
})

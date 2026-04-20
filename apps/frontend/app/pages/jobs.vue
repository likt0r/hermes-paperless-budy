<script setup lang="ts">
definePageMeta({ ssr: false })
useHead({ title: 'Running Jobs' })

import type { JobState } from '~/composables/useGlobalJobs'

const globalJobs = useGlobalJobs()

onMounted(async () => {
  try {
    const data = await $fetch<import('~/composables/useGlobalJobs').JobState[]>('/api/jobs')
    for (const job of data) {
      if (job.jobId) globalJobs.value[job.jobId] = job
    }
  } catch {}
})

const jobsList = computed<JobState[]>(() => {
  const all = Object.values(globalJobs.value)
  const byDoc = new Map<number, JobState>()
  const standalone: JobState[] = []
  for (const job of all) {
    if (job.paperlessDocumentId != null) {
      const prev = byDoc.get(job.paperlessDocumentId)
      if (!prev || (job.timestamp ?? 0) > (prev.timestamp ?? 0)) {
        byDoc.set(job.paperlessDocumentId, job)
      }
    } else {
      standalone.push(job)
    }
  }
  return [...byDoc.values(), ...standalone]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, 50)
})

const columns = [
  { accessorKey: 'paperlessDocumentId', header: 'Doc ID' },
  { accessorKey: 'jobId', header: 'Job ID' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'summary', header: 'Info' },
  { accessorKey: 'timestamp', header: 'Started' }
]

function formatTimestamp(ts?: number) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

const getStatusColor = (status: string) => {
  if (status === 'updated' || status === 'done') return 'success'
  if (status === 'error' || status === 'failed') return 'error'
  if (status === 'queued' || status === 'parsed') return 'neutral'
  return 'primary'
}

function asJobState(row: any): JobState {
  return (row.original ?? row) as JobState
}
</script>

<template>
  <UDashboardPanel id="jobs">
    <template #header>
      <UDashboardNavbar title="Running Jobs" icon="i-lucide-activity" />
    </template>

    <template #body>
      <UCard class="overflow-y-auto">
        <UTable :data="jobsList" :columns="columns">
          <template #paperlessDocumentId-cell="{ row }">
            <span v-if="asJobState(row).paperlessDocumentId" class="font-medium text-primary">#{{ asJobState(row).paperlessDocumentId }}</span>
            <span v-else class="text-muted">-</span>
          </template>

          <template #jobId-cell="{ row }">
            <span class="text-xs text-muted font-mono" :title="asJobState(row).jobId">{{ asJobState(row).jobId.slice(0, 8) }}…</span>
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="getStatusColor(asJobState(row).status)" variant="subtle" size="sm">
              {{ asJobState(row).status }}
            </UBadge>
          </template>

          <template #summary-cell="{ row }">
            <span class="text-xs text-muted line-clamp-1 max-w-xs" :title="asJobState(row).error || asJobState(row).summary || ''">
              <template v-if="asJobState(row).error">
                <UIcon name="i-lucide-alert-triangle" class="text-error mr-1 inline" />
                {{ asJobState(row).error }}
              </template>
              <template v-else-if="asJobState(row).metadata?.title">
                Extracted: {{ asJobState(row).metadata?.title }}
              </template>
              <template v-else>
                {{ asJobState(row).summary || '-' }}
              </template>
            </span>
          </template>

          <template #timestamp-cell="{ row }">
            <span class="text-xs text-muted">{{ formatTimestamp(asJobState(row).timestamp) }}</span>
          </template>
          
          <template #empty-state>
            <div class="flex flex-col items-center justify-center py-12">
              <UIcon name="i-lucide-check-circle-2" class="size-12 text-muted mb-4" />
              <p class="text-sm text-muted">No jobs are currently running</p>
            </div>
          </template>
        </UTable>
      </UCard>
    </template>
  </UDashboardPanel>
</template>

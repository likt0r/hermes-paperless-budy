import type { Handlers, StepConfig } from 'motia'

export const config = {
  name: 'CleanupExtractions',
  description: 'Deletes extraction stream entries older than 7 days',
  flows: ['document-flow'],
  triggers: [{ type: 'cron', expression: '0 0 3 * * * *' }],
  enqueues: [],
} as const satisfies StepConfig

const TTL_MS = 7 * 24 * 60 * 60 * 1000

export const handler: Handlers<typeof config> = async (_input, { logger, streams }) => {
  const cutoff = Date.now() - TTL_MS
  const entries = await streams.extraction.getGroup('jobs')
  let deleted = 0

  for (const entry of entries) {
    if (entry.data.createdAt && new Date(entry.data.createdAt).getTime() < cutoff) {
      await streams.extraction.delete('jobs', entry.id)
      deleted++
    }
  }

  logger.info('CleanupExtractions: done', { deleted, total: entries.length })
}

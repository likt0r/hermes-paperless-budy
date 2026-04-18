import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { paperlessClient } from './services/paperless.service.js'
import { buildIterativeSummary } from './services/metadata-extractor.js'
import type { ReferenceData } from './services/metadata-extractor.js'

const documentParsedInput = z.object({
  jobId: z.string(),
})

export const config = {
  name: 'BuildSummary',
  description: 'Builds iterative summary from document markdown and fetches Paperless reference data',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'queue',
      topic: 'document.parsed',
      input: documentParsedInput,
    },
  ],
  enqueues: ['summary.ready'],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async (input, { logger, state, streams, enqueue }) => {
  const { jobId } = input
  const extractions = await state.get<{ markdown?: string }>('extractions', jobId)
  if (!extractions?.markdown) {
    logger.error('BuildSummary: no markdown in state', { jobId })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: 'No markdown found for job' },
    ])
    return
  }

  try {
    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'summarizing' }])
    logger.info('BuildSummary: building iterative summary', { jobId })
    const [tagsPage, correspondentsPage, documentTypesPage] = await Promise.all([
      paperlessClient.tags.list(),
      paperlessClient.correspondents.list(),
      paperlessClient.documentTypes.list(),
    ])
    const referenceData: ReferenceData = {
      tags: tagsPage.results.map((t) => t.name),
      correspondents: correspondentsPage.results.map((c) => c.name),
      documentTypes: documentTypesPage.results.map((dt) => dt.name),
    }
    logger.info('BuildSummary: getting reference data', { jobId })
    const summary = await buildIterativeSummary(extractions.markdown)
    logger.info('BuildSummary: building iterative summary', { jobId })

    await state.update('extractions', jobId, [
      { type: 'set', path: 'summary', value: summary },
      { type: 'set', path: 'referenceData', value: referenceData },
    ])
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'summarized' },
      { type: 'set', path: 'summary', value: summary },
    ])
    await enqueue({ topic: 'summary.ready', data: { jobId } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('BuildSummary failed', { jobId, error: message })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: message },
    ])
  }
  return undefined
}

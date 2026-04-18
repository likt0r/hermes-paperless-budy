import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { paperlessClient } from '../../services/paperless.service.js'
import {
  buildIterativeSummary,
  extractAll,
  type ReferenceData,
} from '../../services/metadata-extractor.js'

const documentParsedInput = z.object({
  jobId: z.string(),
})

export const config = {
  name: 'SummarizeAndExtractMetadata',
  description: 'Builds iterative summary, then extracts metadata (single LLM pipeline step)',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'queue',
      topic: 'document.parsed',
      input: documentParsedInput,
    },
  ],
  enqueues: ['metadata.extracted'],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async (input, { logger, state, streams, enqueue }) => {
  const { jobId } = input
  const extractions = await state.get<{ markdown?: string }>('extractions', jobId)
  if (!extractions?.markdown) {
    logger.error('SummarizeAndExtractMetadata: no markdown in state', { jobId })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: 'No markdown found for job' },
    ])
    return
  }

  try {
    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'summarizing' }])
    logger.info('SummarizeAndExtractMetadata: fetching Paperless reference data', { jobId })
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

    logger.info('SummarizeAndExtractMetadata: building iterative summary', { jobId })
    const summary = await buildIterativeSummary(extractions.markdown)

    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'summarized' },
      { type: 'set', path: 'summary', value: summary },
    ])

    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'extracting' }])

    const metadata = await extractAll(summary, extractions.markdown, referenceData)

    await state.update('extractions', jobId, [{ type: 'set', path: 'metadata', value: metadata }])
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'done' },
      { type: 'set', path: 'metadata', value: metadata },
    ])
    await enqueue({ topic: 'metadata.extracted', data: { jobId } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('SummarizeAndExtractMetadata failed', { jobId, error: message })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: message },
    ])
  }
  return undefined
}

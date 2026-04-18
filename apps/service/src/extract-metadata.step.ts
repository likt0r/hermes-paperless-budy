import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import type { ReferenceData } from './services/metadata-extractor.js'
import { extractAll } from './services/metadata-extractor.js'

const summaryReadyInput = z.object({
  jobId: z.string()
})

export const config = {
  name: 'ExtractMetadata',
  description: 'Runs 6 parallel LLM extractions and writes metadata to stream',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'queue',
      topic: 'summary.ready',
      input: summaryReadyInput
    }
  ],
  enqueues: ['metadata.extracted'],
} as const satisfies StepConfig

type ExtractionState = {
  markdown?: string
  summary?: string
  referenceData?: ReferenceData
}

export const handler: Handlers<typeof config> = async (input, { logger, state, streams, enqueue }) => {
  const { jobId } = input
  const extractions = await state.get<ExtractionState>('extractions', jobId)
  if (!extractions?.markdown || !extractions?.summary || !extractions?.referenceData) {
    logger.error('ExtractMetadata: missing summary or referenceData', { jobId })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: 'Missing summary or reference data' }
    ])
    return
  }

  try {
    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'extracting' }])

    const metadata = await extractAll(
      extractions.summary,
      extractions.markdown,
      extractions.referenceData
    )

    await state.update('extractions', jobId, [{ type: 'set', path: 'metadata', value: metadata }])
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'done' },
      { type: 'set', path: 'metadata', value: metadata }
    ])
    await enqueue({ topic: 'metadata.extracted', data: { jobId } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('ExtractMetadata failed', { jobId, error: message })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: message }
    ])
  }
  return undefined
}

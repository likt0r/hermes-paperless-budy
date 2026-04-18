import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { paperlessClient } from '../../services/paperless.service.js'
import type { ExtractedMetadata } from '../../services/metadata-extractor.js'

const metadataExtractedInput = z.object({
  jobId: z.string(),
})

export const config = {
  name: 'UpdatePaperlessDocument',
  description: 'Patches the Paperless-NGX document with AI-extracted metadata',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'queue',
      topic: 'metadata.extracted',
      input: metadataExtractedInput,
    },
  ],
  enqueues: [],
} as const satisfies StepConfig

type ExtractionState = {
  paperlessDocumentId?: number
  metadata?: ExtractedMetadata
}

export const handler: Handlers<typeof config> = async (input, { logger, state, streams }) => {
  const { jobId } = input
  const extractions = await state.get<ExtractionState>('extractions', jobId)

  if (!extractions?.paperlessDocumentId) {
    logger.info('UpdatePaperlessDocument: no paperlessDocumentId in state, skipping', { jobId })
    return
  }

  if (!extractions.metadata) {
    logger.error('UpdatePaperlessDocument: no metadata in state', { jobId })
    return
  }

  const { paperlessDocumentId, metadata } = extractions

  try {
    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'updating' }])

    // Resolve names → IDs in parallel
    const [tagsPage, correspondentsPage, docTypesPage] = await Promise.all([
      paperlessClient.tags.list({ page_size: 1000 }),
      paperlessClient.correspondents.list({ page_size: 1000 }),
      paperlessClient.documentTypes.list({ page_size: 1000 }),
    ])

    const tagMap = new Map(tagsPage.results.map((t) => [t.name.toLowerCase(), t.id]))
    const correspondentMap = new Map(correspondentsPage.results.map((c) => [c.name.toLowerCase(), c.id]))
    const docTypeMap = new Map(docTypesPage.results.map((dt) => [dt.name.toLowerCase(), dt.id]))

    const tagIds = metadata.tags
      .map((name) => tagMap.get(name.toLowerCase()))
      .filter((id): id is number => id !== undefined)

    const correspondentId = metadata.correspondent
      ? (correspondentMap.get(metadata.correspondent.toLowerCase()) ?? null)
      : null

    const documentTypeId = metadata.documentType
      ? (docTypeMap.get(metadata.documentType.toLowerCase()) ?? null)
      : null

    await paperlessClient.documents.update(paperlessDocumentId, {
      ...(metadata.title ? { title: metadata.title } : {}),
      ...(correspondentId !== null ? { correspondent: correspondentId } : {}),
      ...(documentTypeId !== null ? { document_type: documentTypeId } : {}),
      ...(tagIds.length > 0 ? { tags: tagIds } : {}),
      ...(metadata.documentDate ? { created: metadata.documentDate } : {}),
    })

    logger.info('UpdatePaperlessDocument: document updated', {
      jobId,
      paperlessDocumentId,
      title: metadata.title,
      correspondent: correspondentId,
      documentType: documentTypeId,
      tags: tagIds,
    })

    await streams.extraction.update('jobs', jobId, [{ type: 'set', path: 'status', value: 'updated' }])
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('UpdatePaperlessDocument failed', { jobId, paperlessDocumentId, error: message })
    await streams.extraction.update('jobs', jobId, [
      { type: 'set', path: 'status', value: 'error' },
      { type: 'set', path: 'error', value: message },
    ])
  }

  return undefined
}

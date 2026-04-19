import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { paperlessClient } from '../../../services/paperless.service.js'
import { convertPdfToMarkdown } from '../../../services/docling.service.js'
import { PaperlessApiError } from '@repo/paperless-client'

const bodySchema = z.object({
  documentId: z.number().int().positive(),
})

export const config = {
  name: 'AnalyzePaperlessDocument',
  description: 'Fetches a document from Paperless by ID and runs the full analysis pipeline',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'http',
      method: 'POST',
      path: '/analyze',
      bodySchema,
      responseSchema: {
        200: z.object({ jobId: z.string(), title: z.string() }),
        404: z.object({ error: z.string() }),
        502: z.object({ error: z.string() }),
      },
    },
  ],
  enqueues: ['document.parsed'],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async (request, { logger, state, streams, enqueue }) => {
  const { documentId } = request.body

  let doc: Awaited<ReturnType<typeof paperlessClient.documents.get>>
  try {
    doc = await paperlessClient.documents.get(documentId)
  } catch (err) {
    if (err instanceof PaperlessApiError && err.status === 404) {
      return { status: 404, body: { error: `Paperless document ${documentId} not found` } }
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('AnalyzePaperlessDocument: failed to fetch document', { documentId, error: message })
    return { status: 502, body: { error: `Paperless error: ${message}` } }
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await paperlessClient.documents.download(documentId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('AnalyzePaperlessDocument: failed to download PDF', { documentId, error: message })
    return { status: 502, body: { error: `Paperless download error: ${message}` } }
  }

  let markdown: string
  try {
    markdown = await convertPdfToMarkdown(pdfBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('AnalyzePaperlessDocument: Docling conversion failed', { documentId, error: message })
    return { status: 502, body: { error: `Docling error: ${message}` } }
  }

  const jobId = crypto.randomUUID()

  await state.set('extractions', jobId, {
    markdown,
    paperlessDocumentId: documentId,
  })
  await streams.extraction.set('jobs', jobId, { status: 'parsed', createdAt: new Date().toISOString() })
  await enqueue({
    topic: 'document.parsed',
    data: { jobId },
    messageGroupId: 'summarize',
  } as Parameters<typeof enqueue>[0] & { messageGroupId: string })

  logger.info('AnalyzePaperlessDocument: queued', { jobId, documentId, title: doc.title })

  return { status: 200, body: { jobId, title: doc.title } }
}

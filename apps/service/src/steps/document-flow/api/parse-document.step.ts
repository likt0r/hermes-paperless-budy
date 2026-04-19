import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { convertPdfToMarkdown } from '../../../services/docling.service.js'

const bodySchema = z.object({
  pdf: z.string(),
  paperlessDocumentId: z.number().int().positive().optional(),
})

export const config = {
  name: 'ParseDocument',
  description: 'Accepts a base64 PDF and returns OCR-extracted markdown via Docling',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'http',
      method: 'POST',
      path: '/parse',
      bodySchema,
      responseSchema: {
        200: z.object({ markdown: z.string(), jobId: z.string() }),
        400: z.object({ error: z.string() }),
        502: z.object({ error: z.string() }),
      },
    },
  ],
  enqueues: ['document.parsed'],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async (request, { logger, state, streams, enqueue }) => {
  const { pdf: base64Pdf, paperlessDocumentId } = request.body

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64Pdf, 'base64')
  } catch {
    return { status: 400, body: { error: 'Invalid base64 PDF content' } }
  }

  if (buffer.length === 0) {
    return { status: 400, body: { error: 'PDF content is empty' } }
  }

  let markdown: string
  try {
    markdown = await convertPdfToMarkdown(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('ParseDocument: Docling conversion failed', { error: message })
    return { status: 502, body: { error: message } }
  }

  const jobId = crypto.randomUUID()
  await state.set('extractions', jobId, { markdown, paperlessDocumentId })
  await streams.extraction.set('jobs', jobId, { status: 'parsed', createdAt: new Date().toISOString() })
  await enqueue({
    topic: 'document.parsed',
    data: { jobId },
    messageGroupId: 'summarize',
  } as Parameters<typeof enqueue>[0] & { messageGroupId: string })

  return { status: 200, body: { markdown, jobId } }
}

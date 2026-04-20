import { getDocumentProcessingQueue } from '../queues/document-processing'
import { convertPdfToMarkdown } from '../services/docling'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ pdf?: string; paperlessDocumentId?: number }>(event)

  if (!body?.pdf) {
    throw createError({ statusCode: 400, statusMessage: 'Missing pdf field (base64 string)' })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(body.pdf, 'base64')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid base64 PDF content' })
  }

  if (buffer.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'PDF content is empty' })
  }

  let markdown: string
  try {
    markdown = await convertPdfToMarkdown(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, statusMessage: message })
  }

  const jobId = crypto.randomUUID()
  await getDocumentProcessingQueue().add(
    'process',
    { markdown, paperlessDocumentId: body.paperlessDocumentId },
    { jobId },
  )

  return { jobId, markdown }
})

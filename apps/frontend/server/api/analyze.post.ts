import { getDocumentProcessingQueue } from '../queues/document-processing'
import { convertPdfToMarkdown } from '../services/docling'
import { getPaperlessClient } from '../services/paperless'
import { emitJobStatus } from '../services/socket'
import { PaperlessApiError } from '@repo/paperless-client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ documentId?: number }>(event)

  if (!body?.documentId || !Number.isInteger(body.documentId) || body.documentId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid documentId' })
  }

  const { documentId } = body
  const paperless = getPaperlessClient()

  let doc: Awaited<ReturnType<typeof paperless.documents.get>>
  try {
    doc = await paperless.documents.get(documentId)
  } catch (err) {
    if (err instanceof PaperlessApiError && err.status === 404) {
      throw createError({ statusCode: 404, statusMessage: `Paperless document ${documentId} not found` })
    }
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, statusMessage: `Paperless error: ${message}` })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await paperless.documents.download(documentId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, statusMessage: `Paperless download error: ${message}` })
  }

  let markdown: string
  try {
    markdown = await convertPdfToMarkdown(pdfBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, statusMessage: `Docling error: ${message}` })
  }

  const queue = getDocumentProcessingQueue()
  const existingJobs = await queue.getJobs(['active', 'waiting', 'delayed'])
  for (const existing of existingJobs) {
    if (existing.data.paperlessDocumentId === documentId) {
      emitJobStatus(existing.id!, 'error', { error: 'Superseded by new analysis' }, documentId)
      try { await existing.remove() } catch { /* active jobs cannot be removed mid-run */ }
    }
  }

  const jobId = crypto.randomUUID()
  await queue.add(
    'process',
    { markdown, paperlessDocumentId: documentId },
    { jobId },
  )
  emitJobStatus(jobId, 'parsed', {}, documentId)

  return { jobId, title: doc.title }
})

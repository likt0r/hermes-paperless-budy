import { getDocumentProcessingQueue } from '../queues/document-processing'
import { convertPdfToMarkdown } from '../services/docling'
import { getPaperlessClient } from '../services/paperless'
import { broadcastJobStatus } from '../services/ws'
import { PaperlessApiError } from '@repo/paperless-client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ documentId?: number, documentUrl?: string }>(event)

  let documentId: number

  if (body?.documentUrl) {
    const match = body.documentUrl.match(/\/documents\/(\d+)/)
    const extracted = match?.[1] ? parseInt(match[1], 10) : NaN
    if (!Number.isFinite(extracted) || extracted <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Could not extract a valid document ID from documentUrl' })
    }
    documentId = extracted
  } else if (body?.documentId && Number.isInteger(body.documentId) && body.documentId > 0) {
    documentId = body.documentId
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Provide either documentId or a valid documentUrl' })
  }
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

  const queue = getDocumentProcessingQueue()
  const existingJobs = await queue.getJobs(['active', 'waiting', 'delayed'])
  for (const existing of existingJobs) {
    if (existing.data.paperlessDocumentId === documentId) {
      broadcastJobStatus(existing.id!, 'error', { error: 'Superseded by new analysis' }, documentId)
      try { await existing.remove() } catch { /* active jobs cannot be removed mid-run */ }
    }
  }

  const jobId = crypto.randomUUID()
  broadcastJobStatus(jobId, 'parsing', {}, documentId)

  let markdown: string
  try {
    markdown = await convertPdfToMarkdown(pdfBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    broadcastJobStatus(jobId, 'error', { error: message }, documentId)
    throw createError({ statusCode: 502, statusMessage: `Docling error: ${message}` })
  }

  await queue.add(
    'process',
    { markdown, paperlessDocumentId: documentId },
    { jobId },
  )
  broadcastJobStatus(jobId, 'parsed', {}, documentId)

  return { jobId, title: doc.title }
})

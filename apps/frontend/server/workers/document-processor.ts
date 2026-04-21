import { consola } from 'consola'
import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { broadcastJobStatus } from '../services/ws'
import { buildIterativeSummary, extractAll } from '../services/metadata-extractor'
import { getPaperlessClient } from '../services/paperless'
import { convertPdfToMarkdown } from '../services/docling'
import type { DocumentProcessingJobData } from '../queues/document-processing'
import type { ExtractedMetadata } from '../services/metadata-extractor'

const logger = consola.withTag('worker')

export function createDocumentWorker(connection: Redis): Worker<DocumentProcessingJobData> {
  const worker = new Worker<DocumentProcessingJobData>(
    'document-processing',
    async (job) => {
      let markdown = job.data.markdown
      const { paperlessDocumentId } = job.data
      const jobId = job.id!

      const setStatus = async (status: string, data?: object) => {
        broadcastJobStatus(jobId, status, data, paperlessDocumentId)
        await job.updateProgress({ status, ...data })
      }

      try {
        if (!markdown) {
          if (!paperlessDocumentId) throw new Error('Job has neither markdown nor paperlessDocumentId')
          await setStatus('parsing')
          const paperlessForDownload = getPaperlessClient()
          const pdfBuffer = await paperlessForDownload.documents.download(paperlessDocumentId)
          markdown = await convertPdfToMarkdown(pdfBuffer)
          await setStatus('parsed')
        }

        await setStatus('summarizing')

        const paperless = getPaperlessClient()
        const t0 = Date.now()
        const [tagsPage, correspondentsPage, documentTypesPage] = await Promise.all([
          paperless.tags.list({ page_size: 1000 }),
          paperless.correspondents.list({ page_size: 1000 }),
          paperless.documentTypes.list({ page_size: 1000 })
        ])
        logger.info(
          `[${jobId}] ref data: ${tagsPage.results.length} tags, ${correspondentsPage.results.length} correspondents, ${documentTypesPage.results.length} types (${Date.now() - t0}ms)`
        )

        const referenceData = {
          tags: tagsPage.results.map(t => t.name),
          correspondents: correspondentsPage.results.map(c => c.name),
          documentTypes: documentTypesPage.results.map(d => d.name)
        }

        const t1 = Date.now()
        const summary = await buildIterativeSummary(markdown)
        logger.info(`[${jobId}] summarized in ${Date.now() - t1}ms`)
        await setStatus('summarized', { summary })

        await setStatus('extracting')
        const t2 = Date.now()
        const metadata = await extractAll(summary, markdown, referenceData, (field, result) => {
          logger.debug(`[${jobId}] extracted ${field}: ${JSON.stringify(result)}`)
        })
        logger.info(`[${jobId}] extraction complete in ${Date.now() - t2}ms`)
        await setStatus('done', { metadata })

        if (paperlessDocumentId) {
          await updatePaperlessDocument(job, paperlessDocumentId, markdown, metadata, setStatus)
          return { status: 'updated', metadata }
        }

        return { status: 'done', metadata }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await setStatus('error', { error: message })
        throw err
      }
    },
    {
      connection,
      concurrency: 1,
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 }
    }
  )

  worker.on('active', (job) => {
    logger.info(
      `[${job.id}] started (paperlessId=${job.data.paperlessDocumentId ?? 'none'}, markdown=${job.data.markdown?.length ?? 'pending'} chars)`
    )
  })
  worker.on('completed', (job) => {
    logger.info(`[${job.id}] completed`)
  })
  worker.on('failed', (job, err) => {
    logger.error(`[${job?.id ?? '?'}] failed: ${err.message}`)
    if (job?.id) broadcastJobStatus(job.id, 'error', { error: err.message }, job.data?.paperlessDocumentId)
  })

  return worker
}

async function updatePaperlessDocument(
  job: import('bullmq').Job<DocumentProcessingJobData>,
  paperlessDocumentId: number,
  markdown: string,
  metadata: ExtractedMetadata,
  setStatus: (status: string, data?: object) => Promise<void>
) {
  await setStatus('updating')

  const paperless = getPaperlessClient()
  const [tagsPage, correspondentsPage, docTypesPage] = await Promise.all([
    paperless.tags.list({ page_size: 1000 }),
    paperless.correspondents.list({ page_size: 1000 }),
    paperless.documentTypes.list({ page_size: 1000 })
  ])

  const tagMap = new Map(tagsPage.results.map(t => [t.name.toLowerCase(), t.id]))

  const correspondentMap = new Map(correspondentsPage.results.map(c => [c.name.toLowerCase(), c.id]))
  const docTypeMap = new Map(docTypesPage.results.map(dt => [dt.name.toLowerCase(), dt.id]))

  const tagIds = metadata.tags
    .map(name => tagMap.get(name.toLowerCase()))
    .filter((id): id is number => id !== undefined)

  const correspondentId = metadata.correspondent
    ? (correspondentMap.get(metadata.correspondent.toLowerCase()) ?? null)
    : null

  const documentTypeId = metadata.documentType
    ? (docTypeMap.get(metadata.documentType.toLowerCase()) ?? null)
    : null

  await paperless.documents.update(paperlessDocumentId, {
    ...(metadata.title ? { title: metadata.title } : {}),
    ...(markdown ? { content: markdown } : {}),
    ...(correspondentId !== null ? { correspondent: correspondentId } : {}),
    ...(documentTypeId !== null ? { document_type: documentTypeId } : {}),
    ...(tagIds.length > 0 ? { tags: tagIds } : {}),
    ...(metadata.documentDate ? { created: metadata.documentDate } : {})
  })

  await setStatus('updated', { metadata })
}

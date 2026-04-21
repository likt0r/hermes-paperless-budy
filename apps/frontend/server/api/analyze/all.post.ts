import { getDocumentProcessingQueue } from '../../queues/document-processing'
import { getPaperlessClient } from '../../services/paperless'
import { broadcastJobStatus } from '../../services/ws'

export default defineEventHandler(async () => {
  const paperless = getPaperlessClient()
  const queue = getDocumentProcessingQueue()

  const documentIds: number[] = []
  let page = 1
  while (true) {
    const result = await paperless.documents.list({ page, page_size: 100, ordering: 'id' })
    documentIds.push(...result.results.map((d) => d.id))
    if (!result.next) break
    page++
  }

  const jobIds: string[] = []
  for (const documentId of documentIds) {
    const jobId = crypto.randomUUID()
    await queue.add('process', { paperlessDocumentId: documentId }, { jobId })
    broadcastJobStatus(jobId, 'queued', {}, documentId)
    jobIds.push(jobId)
  }

  return { count: documentIds.length, jobIds }
})

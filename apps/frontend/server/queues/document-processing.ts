import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export interface DocumentProcessingJobData {
  markdown?: string
  paperlessDocumentId?: number
}

let _queue: Queue<DocumentProcessingJobData> | null = null

export function initDocumentProcessingQueue(connection: Redis): Queue<DocumentProcessingJobData> {
  _queue = new Queue<DocumentProcessingJobData>(
    'document-processing',
    { connection, defaultJobOptions: { attempts: 1 } },
  )
  return _queue
}

export function getDocumentProcessingQueue(): Queue<DocumentProcessingJobData> {
  if (!_queue) throw new Error('Document processing queue not initialized')
  return _queue
}

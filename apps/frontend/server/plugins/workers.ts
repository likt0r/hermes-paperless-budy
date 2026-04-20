import { createRedisConnection } from '../queues/redis'
import { initDocumentProcessingQueue, getDocumentProcessingQueue } from '../queues/document-processing'
import { createDocumentWorker } from '../workers/document-processor'

export default defineNitroPlugin((nitroApp) => {
  const queueConn = createRedisConnection()
  const workerConn = createRedisConnection()

  initDocumentProcessingQueue(queueConn)
  const worker = createDocumentWorker(workerConn)

  nitroApp.hooks.hook('close', async () => {
    await worker.close()
    await getDocumentProcessingQueue().close()
    queueConn.disconnect()
    workerConn.disconnect()
  })
})

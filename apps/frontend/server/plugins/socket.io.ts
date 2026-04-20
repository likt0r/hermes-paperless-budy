import { consola } from 'consola'
import type { NitroApp } from 'nitropack/types'
import type { Server as HttpServer } from 'node:http'
import { io } from '../services/socket'
import { getDocumentProcessingQueue } from '../queues/document-processing'

const logger = consola.withTag('socket.io')

export default defineNitroPlugin((nitroApp: NitroApp) => {
  // Re-register handlers on each reload to pick up code changes; clear first to avoid duplicates.
  io.removeAllListeners('connection')
  logger.info('plugin initialized')

  io.on('connection', (socket) => {
    logger.debug(`client connected: ${socket.id}`)

    socket.join('jobs')
    logger.debug(`socket ${socket.id} joined global jobs room`)

    // Provide a way for clients to fetch the initial/terminal state of a specific job
    socket.on('get-initial-status', async (jobId: string, callback: (data: any) => void) => {
      try {
        const job = await getDocumentProcessingQueue().getJob(jobId)
        if (job) {
          const state = await job.getState()
          logger.debug(`job ${jobId} initial state fetch: ${state}`)
          if (state === 'failed') {
            callback({ status: 'error', error: job.failedReason ?? 'Unknown error' })
          } else if (state === 'completed' && job.returnvalue) {
            callback(job.returnvalue)
          } else {
            callback({ status: state })
          }
        } else {
          callback({ status: 'unknown' })
        }
      } catch (e) {
        logger.warn(`get-initial-status handler error for job ${jobId}:`, e)
        callback({ status: 'error', error: 'Internal server error' })
      }
    })
  })

  // 'listen:node' provides the raw Node.js http.Server — required for
  // Socket.io to intercept both WebSocket upgrades and HTTP polling.
  // 'listen' (without :node) gives a listhen wrapper which doesn't work.
  // @ts-expect-error nitropack types don't expose listen:node yet
  nitroApp.hooks.hook('listen:node', ({ server }: { server: HttpServer }) => {
    logger.info('attaching to HTTP server')
    io.attach(server)
  })

  nitroApp.hooks.hook('close', async () => {
    // Intentionally no-op: io persists via globalThis.__nitroSocketIO so the
    // same attached instance survives hot reloads (listen:node only fires once).
    // On true process exit Node.js closes all WebSocket connections automatically.
  })
})

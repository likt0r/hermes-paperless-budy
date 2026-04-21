import { consola } from 'consola'
import { addPeer, removePeer } from '../services/ws'
import { getDocumentProcessingQueue } from '../queues/document-processing'

const logger = consola.withTag('ws-handler')

export default defineWebSocketHandler({
  open(peer) {
    logger.debug(`connected: ${peer}`)
    addPeer(peer)
  },

  async message(peer, msg) {
    let data: { type?: string, jobId?: string }
    try {
      data = JSON.parse(msg.text())
    } catch {
      return
    }

    if (data.type !== 'get-initial-status' || !data.jobId) return

    const job = await getDocumentProcessingQueue().getJob(data.jobId)
    if (!job) {
      peer.send(JSON.stringify({ type: 'job:status', jobId: data.jobId, status: 'unknown' }))
      return
    }

    const state = await job.getState()
    if (state === 'failed') {
      peer.send(JSON.stringify({ type: 'job:status', jobId: data.jobId, status: 'error', error: job.failedReason ?? 'Unknown error' }))
    } else if (state === 'completed' && job.returnvalue) {
      peer.send(JSON.stringify({ type: 'job:status', jobId: data.jobId, ...job.returnvalue }))
    } else {
      peer.send(JSON.stringify({ type: 'job:status', jobId: data.jobId, status: state }))
    }
  },

  close(peer) {
    logger.debug(`disconnected: ${peer}`)
    removePeer(peer)
  },

  error(peer, err) {
    logger.warn(`error on peer ${peer}:`, err)
    removePeer(peer)
  },
})

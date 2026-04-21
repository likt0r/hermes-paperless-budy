import type { Peer } from 'crossws'
import { consola } from 'consola'

const logger = consola.withTag('ws')

declare global {
  // eslint-disable-next-line no-var
  var __wsPeers: Set<Peer> | undefined
}

// Persists across Nitro hot reloads — same pattern as the old Socket.IO singleton
if (!globalThis.__wsPeers) globalThis.__wsPeers = new Set()
export const peers = globalThis.__wsPeers

export function addPeer(peer: Peer) {
  peers.add(peer)
}

export function removePeer(peer: Peer) {
  peers.delete(peer)
}

export function broadcastJobStatus(jobId: string, status: string, data?: object, paperlessDocumentId?: number): void {
  const message = JSON.stringify({ type: 'job:status', jobId, status, paperlessDocumentId, ...data })
  logger.info(`broadcast ${status} for job ${jobId} → ${peers.size} peer(s)`)
  for (const peer of peers) peer.send(message)
}

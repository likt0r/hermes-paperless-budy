import { Server } from 'socket.io'
import { consola } from 'consola'

const logger = consola.withTag('socket')

declare global {
  // eslint-disable-next-line no-var
  var __nitroSocketIO: Server | undefined
}

// Persists across Nitro hot reloads — listen:node only fires on first start in dev,
// so a new Server() each reload would be unattached and useSocketIO() would point at it
// while existing clients are still on the old instance.
if (!globalThis.__nitroSocketIO) {
  globalThis.__nitroSocketIO = new Server({ cors: { origin: '*' } })
}

export const io = globalThis.__nitroSocketIO

export function useSocketIO(): Server {
  return io
}

export function emitJobStatus(jobId: string, status: string, data?: object, paperlessDocumentId?: number): void {
  const room = 'jobs'
  const subscribers = io.sockets.adapter.rooms.get(room)?.size ?? 0
  logger.info(`emit ${status} for job ${jobId} → ${room} (${subscribers} subscriber(s))`)
  io.to(room).emit('job:status', { jobId, status, paperlessDocumentId, ...data })
}

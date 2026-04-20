import { consola } from 'consola'
import { useSocketIO } from '../services/socket'

const logger = consola.withTag('socket-mw')

export default defineEventHandler((event) => {
  logger.debug(`request: ${event.path}`)

  if (!event.path?.startsWith('/socket.io')) return

  logger.info(`handling: ${event.path}`)

  // Prevent Nuxt's SSR renderer from seeing socket.io requests regardless of
  // whether the io instance is ready yet (avoids Vue Router "no match" warnings)
  event._handled = true

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSocketIO().engine.handleRequest(event.node.req as any, event.node.res)
})

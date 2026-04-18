import { createPaperlessClient } from '@repo/paperless-client'

export const paperlessClient = createPaperlessClient({
  baseUrl: process.env.PAPERLESS_URL ?? '',
  token: process.env.PAPERLESS_TOKEN ?? '',
})

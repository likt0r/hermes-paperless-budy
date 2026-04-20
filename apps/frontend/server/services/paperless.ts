import { createPaperlessClient } from '@repo/paperless-client'

let _client: ReturnType<typeof createPaperlessClient> | undefined

export function getPaperlessClient(): ReturnType<typeof createPaperlessClient> {
  if (!_client) {
    const { paperlessUrl, paperlessToken } = useRuntimeConfig()
    _client = createPaperlessClient({ baseUrl: paperlessUrl, token: paperlessToken })
  }
  return _client
}

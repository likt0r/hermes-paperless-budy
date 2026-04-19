import type { ClientConfig } from '../types/config.js'
import { PaperlessApiError } from '../lib/fetch-json.js'

export async function downloadDocument(config: ClientConfig, id: number): Promise<Buffer> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/api/documents/${id}/download/`
  const res = await fetch(url, {
    headers: { Authorization: `Token ${config.token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new PaperlessApiError(res.status, body, url)
  }
  return Buffer.from(await res.arrayBuffer())
}

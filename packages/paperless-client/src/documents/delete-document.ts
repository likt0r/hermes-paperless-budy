import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'

export async function deleteDocument(config: ClientConfig, id: number): Promise<void> {
  return fetchJson<void>(config, `/api/documents/${id}/`, { method: 'DELETE' })
}

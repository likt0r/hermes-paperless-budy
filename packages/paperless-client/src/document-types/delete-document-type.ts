import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'

export async function deleteDocumentType(config: ClientConfig, id: number): Promise<void> {
  return fetchJson<void>(config, `/api/document_types/${id}/`, { method: 'DELETE' })
}

import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { BulkEditPayload } from '../types/document.js'

export async function bulkEditDocuments(config: ClientConfig, payload: BulkEditPayload): Promise<void> {
  return fetchJson<void>(config, '/api/documents/bulk_edit/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

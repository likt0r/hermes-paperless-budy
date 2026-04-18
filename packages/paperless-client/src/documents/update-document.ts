import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentPatch, DocumentRaw } from '../types/document.js'

export async function updateDocument(config: ClientConfig, id: number, patch: DocumentPatch): Promise<DocumentRaw> {
  return fetchJson<DocumentRaw>(config, `/api/documents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

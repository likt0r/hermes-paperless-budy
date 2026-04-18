import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentType, DocumentTypeUpdate } from '../types/document-type.js'

export async function updateDocumentType(
  config: ClientConfig,
  id: number,
  data: DocumentTypeUpdate,
): Promise<DocumentType> {
  return fetchJson<DocumentType>(config, `/api/document_types/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

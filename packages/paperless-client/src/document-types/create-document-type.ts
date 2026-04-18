import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentType, DocumentTypeCreate } from '../types/document-type.js'

export async function createDocumentType(config: ClientConfig, data: DocumentTypeCreate): Promise<DocumentType> {
  return fetchJson<DocumentType>(config, '/api/document_types/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

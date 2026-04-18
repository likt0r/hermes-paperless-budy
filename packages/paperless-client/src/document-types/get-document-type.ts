import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentType } from '../types/document-type.js'

export async function getDocumentType(config: ClientConfig, id: number): Promise<DocumentType> {
  return fetchJson<DocumentType>(config, `/api/document_types/${id}/`)
}

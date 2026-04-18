import { buildQuery } from '../lib/build-query.js'
import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentType, DocumentTypeFilters } from '../types/document-type.js'
import type { PaginatedResponse } from '../types/pagination.js'

export async function listDocumentTypes(
  config: ClientConfig,
  filters?: DocumentTypeFilters,
): Promise<PaginatedResponse<DocumentType>> {
  const qs = buildQuery(filters as Record<string, unknown>)
  return fetchJson<PaginatedResponse<DocumentType>>(config, `/api/document_types/${qs}`)
}

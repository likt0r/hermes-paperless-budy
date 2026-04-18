import { buildQuery } from '../lib/build-query.js'
import { fetchJson } from '../lib/fetch-json.js'
import { pickFields } from '../lib/pick-fields.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentFilters, DocumentRaw } from '../types/document.js'
import type { PaginatedResponse } from '../types/pagination.js'

export async function listDocuments<K extends keyof DocumentRaw>(
  config: ClientConfig,
  filters?: DocumentFilters,
  options?: { select: K[] },
): Promise<PaginatedResponse<Pick<DocumentRaw, K>>>

export async function listDocuments(
  config: ClientConfig,
  filters?: DocumentFilters,
  options?: { select?: undefined },
): Promise<PaginatedResponse<DocumentRaw>>

export async function listDocuments<K extends keyof DocumentRaw>(
  config: ClientConfig,
  filters?: DocumentFilters,
  options?: { select?: K[] },
): Promise<PaginatedResponse<DocumentRaw | Pick<DocumentRaw, K>>> {
  const qs = buildQuery(filters as Record<string, unknown>)
  const page = await fetchJson<PaginatedResponse<DocumentRaw>>(config, `/api/documents/${qs}`)
  if (!options?.select) return page
  return {
    ...page,
    results: page.results.map((doc) => pickFields(doc, options.select as K[])),
  }
}

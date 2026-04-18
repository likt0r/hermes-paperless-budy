import { buildQuery } from '../lib/build-query.js'
import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Correspondent, CorrespondentFilters } from '../types/correspondent.js'
import type { PaginatedResponse } from '../types/pagination.js'

export async function listCorrespondents(
  config: ClientConfig,
  filters?: CorrespondentFilters,
): Promise<PaginatedResponse<Correspondent>> {
  const qs = buildQuery(filters as Record<string, unknown>)
  return fetchJson<PaginatedResponse<Correspondent>>(config, `/api/correspondents/${qs}`)
}

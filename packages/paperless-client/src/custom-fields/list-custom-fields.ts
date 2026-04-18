import { buildQuery } from '../lib/build-query.js'
import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { CustomField, CustomFieldFilters } from '../types/custom-field.js'
import type { PaginatedResponse } from '../types/pagination.js'

export async function listCustomFields(
  config: ClientConfig,
  filters?: CustomFieldFilters,
): Promise<PaginatedResponse<CustomField>> {
  const qs = buildQuery(filters as Record<string, unknown>)
  return fetchJson<PaginatedResponse<CustomField>>(config, `/api/custom_fields/${qs}`)
}

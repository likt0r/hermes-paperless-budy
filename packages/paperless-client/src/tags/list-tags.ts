import { buildQuery } from '../lib/build-query.js'
import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { PaginatedResponse } from '../types/pagination.js'
import type { Tag, TagFilters } from '../types/tag.js'

export async function listTags(config: ClientConfig, filters?: TagFilters): Promise<PaginatedResponse<Tag>> {
  const qs = buildQuery(filters as Record<string, unknown>)
  return fetchJson<PaginatedResponse<Tag>>(config, `/api/tags/${qs}`)
}

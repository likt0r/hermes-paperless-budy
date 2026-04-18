import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Tag, TagUpdate } from '../types/tag.js'

export async function updateTag(config: ClientConfig, id: number, data: TagUpdate): Promise<Tag> {
  return fetchJson<Tag>(config, `/api/tags/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

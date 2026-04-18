import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Tag, TagCreate } from '../types/tag.js'

export async function createTag(config: ClientConfig, data: TagCreate): Promise<Tag> {
  return fetchJson<Tag>(config, '/api/tags/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

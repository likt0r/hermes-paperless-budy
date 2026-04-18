import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Tag } from '../types/tag.js'

export async function getTag(config: ClientConfig, id: number): Promise<Tag> {
  return fetchJson<Tag>(config, `/api/tags/${id}/`)
}

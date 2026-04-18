import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Correspondent } from '../types/correspondent.js'

export async function getCorrespondent(config: ClientConfig, id: number): Promise<Correspondent> {
  return fetchJson<Correspondent>(config, `/api/correspondents/${id}/`)
}

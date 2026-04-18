import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Correspondent, CorrespondentCreate } from '../types/correspondent.js'

export async function createCorrespondent(config: ClientConfig, data: CorrespondentCreate): Promise<Correspondent> {
  return fetchJson<Correspondent>(config, '/api/correspondents/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

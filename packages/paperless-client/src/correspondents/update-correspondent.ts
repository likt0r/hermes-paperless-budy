import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { Correspondent, CorrespondentUpdate } from '../types/correspondent.js'

export async function updateCorrespondent(
  config: ClientConfig,
  id: number,
  data: CorrespondentUpdate,
): Promise<Correspondent> {
  return fetchJson<Correspondent>(config, `/api/correspondents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { CustomField } from '../types/custom-field.js'

export async function getCustomField(config: ClientConfig, id: number): Promise<CustomField> {
  return fetchJson<CustomField>(config, `/api/custom_fields/${id}/`)
}

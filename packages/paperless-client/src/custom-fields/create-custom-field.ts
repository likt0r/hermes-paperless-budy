import { fetchJson } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { CustomField, CustomFieldCreate } from '../types/custom-field.js'

export async function createCustomField(config: ClientConfig, data: CustomFieldCreate): Promise<CustomField> {
  return fetchJson<CustomField>(config, '/api/custom_fields/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

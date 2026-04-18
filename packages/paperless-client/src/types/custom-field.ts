export type CustomFieldDataType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'url'
  | 'monetary'
  | 'document_link'

export interface CustomField {
  id: number
  name: string
  data_type: CustomFieldDataType
  extra_data: Record<string, unknown>
  document_count: number
}

export interface CustomFieldValue {
  field: number
  value: unknown
}

export type CustomFieldCreate = Pick<CustomField, 'name' | 'data_type'>

export interface CustomFieldFilters {
  page?: number
  page_size?: number
}

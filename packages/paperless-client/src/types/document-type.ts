export interface DocumentType {
  id: number
  name: string
  slug: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  owner: number | null
}

export type DocumentTypeCreate = Pick<DocumentType, 'name'> &
  Partial<Pick<DocumentType, 'match' | 'matching_algorithm' | 'is_insensitive' | 'owner'>>

export type DocumentTypeUpdate = Partial<DocumentTypeCreate>

export interface DocumentTypeFilters {
  page?: number
  page_size?: number
  ordering?: string
}

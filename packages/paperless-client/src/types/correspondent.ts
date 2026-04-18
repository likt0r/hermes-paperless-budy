export interface Correspondent {
  id: number
  name: string
  slug: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  last_correspondence: string | null
  owner: number | null
}

export type CorrespondentCreate = Pick<Correspondent, 'name'> &
  Partial<Pick<Correspondent, 'match' | 'matching_algorithm' | 'is_insensitive' | 'owner'>>

export type CorrespondentUpdate = Partial<CorrespondentCreate>

export interface CorrespondentFilters {
  page?: number
  page_size?: number
  ordering?: string
}

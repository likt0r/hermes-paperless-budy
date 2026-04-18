export interface Tag {
  id: number
  name: string
  colour: number
  text_colour: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  is_inbox_tag: boolean
  document_count: number
  owner: number | null
}

export type TagCreate = Pick<Tag, 'name'> &
  Partial<Pick<Tag, 'colour' | 'match' | 'matching_algorithm' | 'is_insensitive' | 'is_inbox_tag' | 'owner'>>

export type TagUpdate = Partial<TagCreate>

export interface TagFilters {
  page?: number
  page_size?: number
  ordering?: string
}

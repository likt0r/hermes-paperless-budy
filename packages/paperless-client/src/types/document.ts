import type { Correspondent } from './correspondent.js'
import type { CustomFieldValue } from './custom-field.js'
import type { DocumentType } from './document-type.js'
import type { Tag } from './tag.js'

export interface DocumentRaw {
  id: number
  title: string
  content: string
  created: string
  created_date: string
  modified: string
  added: string
  archive_serial_number: number | null
  original_file_name: string
  archived_file_name: string | null
  /** Correspondent ID — use resolve flag to get full object */
  correspondent: number | null
  /** Document type ID — use resolve flag to get full object */
  document_type: number | null
  /** Tags are returned as full objects by the API */
  tags: Tag[]
  custom_fields: CustomFieldValue[]
  owner: number | null
  notes: DocumentNote[]
  page_count: number | null
}

export interface DocumentNote {
  id: number
  note: string
  created: string
  deleted_at: string | null
  document: number
  user: number
}

export interface DocumentResolved extends Omit<DocumentRaw, 'correspondent' | 'document_type'> {
  correspondent: Correspondent | null
  document_type: DocumentType | null
}

export interface DocumentFilters {
  /** Full-text search across document content */
  query?: string
  /** Filter by title text */
  title?: string
  /** Filter by correspondent ID */
  correspondent?: number
  /** Filter by document type ID */
  document_type?: number
  /** Filter by tag IDs — multiple values become repeated params */
  tags?: number[]
  /** Filter by storage path ID */
  storage_path?: number
  page?: number
  page_size?: number
  /** Field to sort by, prefix with '-' for descending, e.g. '-created' */
  ordering?: string
}

export interface DocumentUploadPayload {
  file: Blob | File
  title?: string
  correspondent?: number
  document_type?: number
  tags?: number[]
  /** ISO 8601 date string */
  created?: string
}

// Write format differs from read: tags accepts IDs, not full Tag objects
export interface DocumentPatch {
  title?: string
  correspondent?: number | null
  document_type?: number | null
  tags?: number[]
  custom_fields?: CustomFieldValue[]
  created?: string
  archive_serial_number?: number | null
}

export interface BulkEditPayload {
  documents: number[]
  method: string
  parameters: Record<string, unknown>
}

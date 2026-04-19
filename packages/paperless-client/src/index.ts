import { listCorrespondents } from './correspondents/list-correspondents.js'
import { getCorrespondent } from './correspondents/get-correspondent.js'
import { createCorrespondent } from './correspondents/create-correspondent.js'
import { updateCorrespondent } from './correspondents/update-correspondent.js'
import { deleteCorrespondent } from './correspondents/delete-correspondent.js'
import { listCustomFields } from './custom-fields/list-custom-fields.js'
import { getCustomField } from './custom-fields/get-custom-field.js'
import { createCustomField } from './custom-fields/create-custom-field.js'
import { listDocumentTypes } from './document-types/list-document-types.js'
import { getDocumentType } from './document-types/get-document-type.js'
import { createDocumentType } from './document-types/create-document-type.js'
import { updateDocumentType } from './document-types/update-document-type.js'
import { deleteDocumentType } from './document-types/delete-document-type.js'
import { bulkEditDocuments } from './documents/bulk-edit-documents.js'
import { deleteDocument } from './documents/delete-document.js'
import { downloadDocument } from './documents/download-document.js'
import { getDocument } from './documents/get-document.js'
import { listDocuments } from './documents/list-documents.js'
import { updateDocument } from './documents/update-document.js'
import { uploadDocument } from './documents/upload-document.js'
import { listTags } from './tags/list-tags.js'
import { getTag } from './tags/get-tag.js'
import { createTag } from './tags/create-tag.js'
import { updateTag } from './tags/update-tag.js'
import { deleteTag } from './tags/delete-tag.js'
import type { ClientConfig } from './types/config.js'
import type { BulkEditPayload, DocumentFilters, DocumentPatch, DocumentRaw, DocumentResolved, DocumentUploadPayload } from './types/document.js'
import type { CorrespondentCreate, CorrespondentFilters, CorrespondentUpdate } from './types/correspondent.js'
import type { CustomFieldCreate, CustomFieldFilters } from './types/custom-field.js'
import type { DocumentTypeCreate, DocumentTypeFilters, DocumentTypeUpdate } from './types/document-type.js'
import type { TagCreate, TagFilters, TagUpdate } from './types/tag.js'
import type { PaginatedResponse } from './types/pagination.js'

export { PaperlessApiError } from './lib/fetch-json.js'

// Re-export all public types
export type { ClientConfig } from './types/config.js'
export type { PaginatedResponse } from './types/pagination.js'
export type { Tag, TagCreate, TagUpdate, TagFilters } from './types/tag.js'
export type { Correspondent, CorrespondentCreate, CorrespondentUpdate, CorrespondentFilters } from './types/correspondent.js'
export type { DocumentType, DocumentTypeCreate, DocumentTypeUpdate, DocumentTypeFilters } from './types/document-type.js'
export type {
  CustomField,
  CustomFieldValue,
  CustomFieldCreate,
  CustomFieldDataType,
  CustomFieldFilters,
} from './types/custom-field.js'
export type {
  DocumentRaw,
  DocumentResolved,
  DocumentFilters,
  DocumentUploadPayload,
  DocumentPatch,
  DocumentNote,
  BulkEditPayload,
} from './types/document.js'

// Overload signatures for client.documents.get — preserves type narrowing via resolve flag
export interface DocumentsGetOverloads {
  (id: number, options: { resolve: true }): Promise<DocumentResolved>
  <K extends keyof DocumentRaw>(id: number, options: { resolve?: false; select: K[] }): Promise<Pick<DocumentRaw, K>>
  (id: number, options?: { resolve?: false; select?: undefined }): Promise<DocumentRaw>
}

// Overload signatures for client.documents.list — preserves type narrowing via select
export interface DocumentsListOverloads {
  <K extends keyof DocumentRaw>(filters: DocumentFilters | undefined, options: { select: K[] }): Promise<PaginatedResponse<Pick<DocumentRaw, K>>>
  (filters?: DocumentFilters, options?: { select?: undefined }): Promise<PaginatedResponse<DocumentRaw>>
}

export function createPaperlessClient(config: ClientConfig) {
  return {
    documents: {
      list: ((filters?: DocumentFilters, options?: { select?: (keyof DocumentRaw)[] }) =>
        listDocuments(config, filters, options as never)) as DocumentsListOverloads,
      get: ((id: number, options?: { resolve?: boolean; select?: (keyof DocumentRaw)[] }) =>
        getDocument(config, id, options as never)) as DocumentsGetOverloads,
      upload: (payload: DocumentUploadPayload) => uploadDocument(config, payload),
      update: (id: number, patch: DocumentPatch) => updateDocument(config, id, patch),
      download: (id: number) => downloadDocument(config, id),
      delete: (id: number) => deleteDocument(config, id),
      bulkEdit: (payload: BulkEditPayload) => bulkEditDocuments(config, payload),
    },
    tags: {
      list: (filters?: TagFilters) => listTags(config, filters),
      get: (id: number) => getTag(config, id),
      create: (data: TagCreate) => createTag(config, data),
      update: (id: number, data: TagUpdate) => updateTag(config, id, data),
      delete: (id: number) => deleteTag(config, id),
    },
    correspondents: {
      list: (filters?: CorrespondentFilters) => listCorrespondents(config, filters),
      get: (id: number) => getCorrespondent(config, id),
      create: (data: CorrespondentCreate) => createCorrespondent(config, data),
      update: (id: number, data: CorrespondentUpdate) => updateCorrespondent(config, id, data),
      delete: (id: number) => deleteCorrespondent(config, id),
    },
    documentTypes: {
      list: (filters?: DocumentTypeFilters) => listDocumentTypes(config, filters),
      get: (id: number) => getDocumentType(config, id),
      create: (data: DocumentTypeCreate) => createDocumentType(config, data),
      update: (id: number, data: DocumentTypeUpdate) => updateDocumentType(config, id, data),
      delete: (id: number) => deleteDocumentType(config, id),
    },
    customFields: {
      list: (filters?: CustomFieldFilters) => listCustomFields(config, filters),
      get: (id: number) => getCustomField(config, id),
      create: (data: CustomFieldCreate) => createCustomField(config, data),
    },
  }
}

export type PaperlessClient = ReturnType<typeof createPaperlessClient>

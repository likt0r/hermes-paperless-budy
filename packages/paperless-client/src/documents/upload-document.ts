import { fetchForm } from '../lib/fetch-json.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentUploadPayload } from '../types/document.js'

export async function uploadDocument(
  config: ClientConfig,
  payload: DocumentUploadPayload,
): Promise<{ task_id: string }> {
  const form = new FormData()
  form.append('document', payload.file)
  if (payload.title !== undefined) form.append('title', payload.title)
  if (payload.correspondent !== undefined) form.append('correspondent', String(payload.correspondent))
  if (payload.document_type !== undefined) form.append('document_type', String(payload.document_type))
  if (payload.created !== undefined) form.append('created', payload.created)
  if (payload.tags) {
    for (const tag of payload.tags) {
      form.append('tags', String(tag))
    }
  }
  return fetchForm<{ task_id: string }>(config, '/api/documents/post_document/', form)
}

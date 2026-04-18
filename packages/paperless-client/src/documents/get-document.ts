import { fetchJson } from '../lib/fetch-json.js'
import { pickFields } from '../lib/pick-fields.js'
import type { ClientConfig } from '../types/config.js'
import type { DocumentRaw, DocumentResolved } from '../types/document.js'

export async function getDocument(
  config: ClientConfig,
  id: number,
  options: { resolve: true },
): Promise<DocumentResolved>

export async function getDocument<K extends keyof DocumentRaw>(
  config: ClientConfig,
  id: number,
  options: { resolve?: false; select: K[] },
): Promise<Pick<DocumentRaw, K>>

export async function getDocument(
  config: ClientConfig,
  id: number,
  options?: { resolve?: false; select?: undefined },
): Promise<DocumentRaw>

export async function getDocument<K extends keyof DocumentRaw>(
  config: ClientConfig,
  id: number,
  options?: { resolve?: boolean; select?: K[] },
): Promise<DocumentRaw | DocumentResolved | Pick<DocumentRaw, K>> {
  const doc = await fetchJson<DocumentRaw>(config, `/api/documents/${id}/`)

  if (options?.resolve === true) {
    const [correspondent, documentType] = await Promise.all([
      doc.correspondent !== null
        ? fetchJson(config, `/api/correspondents/${doc.correspondent}/`)
        : Promise.resolve(null),
      doc.document_type !== null
        ? fetchJson(config, `/api/document_types/${doc.document_type}/`)
        : Promise.resolve(null),
    ])
    return { ...doc, correspondent, document_type: documentType } as DocumentResolved
  }

  if (options?.select) {
    return pickFields(doc, options.select)
  }

  return doc
}

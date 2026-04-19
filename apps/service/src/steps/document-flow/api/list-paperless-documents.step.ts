import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') })

import type { Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import { paperlessClient } from '../../../services/paperless.service.js'

const documentSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  created: z.string(),
  modified: z.string(),
  added: z.string(),
  originalFileName: z.string(),
  pageCount: z.number().nullable(),
  correspondent: z.object({ id: z.number(), name: z.string() }).nullable(),
  documentType: z.object({ id: z.number(), name: z.string() }).nullable(),
  tags: z.array(z.object({ id: z.number(), name: z.string() })),
  contentPreview: z.string()
})

const responseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  page: z.number(),
  pageSize: z.number(),
  results: z.array(documentSummarySchema)
})

export const config = {
  name: 'ListPaperlessDocuments',
  description: 'Lists Paperless documents with resolved correspondent/type/tags for the frontend',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'http',
      method: 'GET',
      path: '/paperless/documents',
      queryParams: [
        { name: 'page', description: 'Page number (1-based)' },
        { name: 'pageSize', description: 'Items per page (default 24, max 100)' },
        { name: 'query', description: 'Full-text search query' },
        { name: 'ordering', description: 'Sort field; prefix with - for descending (default -created)' }
      ],
      responseSchema: {
        200: responseSchema,
        502: z.object({ error: z.string() })
      }
    }
  ],
  enqueues: []
} as const satisfies StepConfig

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100
const PREVIEW_CHAR_LIMIT = 280

function pickQuery(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const handler: Handlers<typeof config> = async (request, { logger }) => {
  const page = parsePositiveInt(pickQuery(request.queryParams.page), 1)
  const rawPageSize = parsePositiveInt(pickQuery(request.queryParams.pageSize), DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE)
  const query = pickQuery(request.queryParams.query)
  const ordering = pickQuery(request.queryParams.ordering) ?? '-created'

  try {
    const documentsPage = await paperlessClient.documents.list({
      page,
      page_size: pageSize,
      ordering,
      ...(query ? { query } : {})
    })

    // Paperless list responses return correspondent/document_type/tags as IDs (numbers), not full objects.
    // Load lookup tables once so we can surface names in the card UI.
    const [correspondentsPage, docTypesPage, tagsPage] = await Promise.all([
      paperlessClient.correspondents.list({ page_size: 1000 }),
      paperlessClient.documentTypes.list({ page_size: 1000 }),
      paperlessClient.tags.list({ page_size: 1000 })
    ])

    const correspondentMap = new Map<number, string>(
      correspondentsPage.results.map((c) => [c.id, c.name])
    )
    const docTypeMap = new Map<number, string>(
      docTypesPage.results.map((dt) => [dt.id, dt.name])
    )
    const tagMap = new Map<number, string>(
      tagsPage.results.map((t) => [t.id, t.name])
    )

    const results = documentsPage.results.map((doc) => {
      const correspondentName = doc.correspondent !== null ? correspondentMap.get(doc.correspondent) : undefined
      const docTypeName = doc.document_type !== null ? docTypeMap.get(doc.document_type) : undefined
      const content = (doc.content ?? '').trim()
      const contentPreview = content.length > PREVIEW_CHAR_LIMIT
        ? `${content.slice(0, PREVIEW_CHAR_LIMIT)}…`
        : content

      const rawTags = doc.tags as unknown as Array<number | { id: number, name?: string }>
      const tags = rawTags.map((entry) => {
        if (typeof entry === 'number') {
          return { id: entry, name: tagMap.get(entry) ?? `#${entry}` }
        }
        return { id: entry.id, name: entry.name ?? tagMap.get(entry.id) ?? `#${entry.id}` }
      })

      return {
        id: doc.id,
        title: doc.title,
        created: doc.created,
        modified: doc.modified,
        added: doc.added,
        originalFileName: doc.original_file_name,
        pageCount: doc.page_count,
        correspondent: doc.correspondent !== null && correspondentName
          ? { id: doc.correspondent, name: correspondentName }
          : null,
        documentType: doc.document_type !== null && docTypeName
          ? { id: doc.document_type, name: docTypeName }
          : null,
        tags,
        contentPreview
      }
    })

    return {
      status: 200,
      body: {
        count: documentsPage.count,
        next: documentsPage.next,
        previous: documentsPage.previous,
        page,
        pageSize,
        results
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('ListPaperlessDocuments failed', { error: message })
    return { status: 502, body: { error: `Paperless error: ${message}` } }
  }
}

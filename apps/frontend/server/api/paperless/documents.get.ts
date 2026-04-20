import { getPaperlessClient } from '../../services/paperless'

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100
const PREVIEW_CHAR_LIMIT = 280

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = parsePositiveInt(String(query.page ?? ''), 1)
  const rawPageSize = parsePositiveInt(String(query.pageSize ?? ''), DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE)
  const search = query.query ? String(query.query) : undefined
  const ordering = query.ordering ? String(query.ordering) : '-created'

  const paperless = getPaperlessClient()

  try {
    const documentsPage = await paperless.documents.list({
      page,
      page_size: pageSize,
      ordering,
      ...(search ? { query: search } : {}),
    })

    const [correspondentsPage, docTypesPage, tagsPage] = await Promise.all([
      paperless.correspondents.list({ page_size: 1000 }),
      paperless.documentTypes.list({ page_size: 1000 }),
      paperless.tags.list({ page_size: 1000 })
    ])

    const correspondentMap = new Map<number, string>(correspondentsPage.results.map((c) => [c.id, c.name]))
    const docTypeMap = new Map<number, string>(docTypesPage.results.map((dt) => [dt.id, dt.name]))
    const tagMap = new Map<number, string>(tagsPage.results.map((t) => [t.id, t.name]))

    const results = documentsPage.results.map((doc) => {
      const correspondentName = doc.correspondent !== null ? correspondentMap.get(doc.correspondent) : undefined
      const docTypeName = doc.document_type !== null ? docTypeMap.get(doc.document_type) : undefined
      const content = (doc.content ?? '').trim()
      const contentPreview = content.length > PREVIEW_CHAR_LIMIT
        ? `${content.slice(0, PREVIEW_CHAR_LIMIT)}…`
        : content

      const rawTags = doc.tags as unknown as Array<number | { id: number; name?: string }>
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
        contentPreview,
      }
    })

    return {
      count: documentsPage.count,
      next: documentsPage.next,
      previous: documentsPage.previous,
      page,
      pageSize,
      results,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, statusMessage: `Paperless error: ${message}` })
  }
})

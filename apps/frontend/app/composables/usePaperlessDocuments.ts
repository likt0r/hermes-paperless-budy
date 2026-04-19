export type PaperlessDocumentSummary = {
  id: number
  title: string
  created: string
  modified: string
  added: string
  originalFileName: string
  pageCount: number | null
  correspondent: { id: number, name: string } | null
  documentType: { id: number, name: string } | null
  tags: Array<{ id: number, name: string }>
  contentPreview: string
}

export type PaperlessDocumentsResponse = {
  count: number
  next: string | null
  previous: string | null
  page: number
  pageSize: number
  results: PaperlessDocumentSummary[]
}

type ListQuery = {
  page?: number
  pageSize?: number
  query?: string
  ordering?: string
}

export function usePaperlessDocuments(initial: ListQuery = {}) {
  const query = reactive({
    page: initial.page ?? 1,
    pageSize: initial.pageSize ?? 24,
    query: initial.query ?? '',
    ordering: initial.ordering ?? '-created'
  })

  const params = computed(() => {
    const out: Record<string, string> = {
      page: String(query.page),
      pageSize: String(query.pageSize),
      ordering: query.ordering
    }
    if (query.query.trim()) out.query = query.query.trim()
    return out
  })

  const { data, pending, error, refresh } = useFetch<PaperlessDocumentsResponse>('/service/paperless/documents', {
    query: params,
    server: false,
    lazy: true
  })

  return { query, data, pending, error, refresh }
}

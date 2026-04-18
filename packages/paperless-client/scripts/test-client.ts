/**
 * Paperless client smoke test
 * Run: bun --env-file=.env scripts/test-client.ts
 */
import { createPaperlessClient, PaperlessApiError } from '../src/index.js'

// ── config ────────────────────────────────────────────────────────────────────

const baseUrl = process.env.PAPERLESS_URL?.trim()
const token = process.env.PAPERLESS_TOKEN?.trim()

if (!baseUrl || !token) {
  console.error('Missing PAPERLESS_URL or PAPERLESS_TOKEN. Copy .env.example to .env and fill in the values.')
  process.exit(1)
}

const client = createPaperlessClient({ baseUrl, token })

// ── helpers ───────────────────────────────────────────────────────────────────

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

function section(label: string) {
  console.log(`\n${cyan('─'.repeat(60))}`)
  console.log(bold(cyan(`  ${label}`)))
  console.log(cyan('─'.repeat(60)))
}

function ok(label: string, detail: string) {
  console.log(`  ${green('✓')} ${bold(label.padEnd(20))} ${dim(detail)}`)
}

function fail(label: string, err: unknown) {
  const msg = err instanceof PaperlessApiError ? `HTTP ${err.status}: ${err.body.slice(0, 120)}` : String(err)
  console.log(`  ${red('✗')} ${bold(label.padEnd(20))} ${red(msg)}`)
}

let passed = 0
let failed = 0

async function run<T>(label: string, fn: () => Promise<T>, summary: (r: T) => string): Promise<T | null> {
  try {
    const result = await fn()
    ok(label, summary(result))
    passed++
    return result
  } catch (err) {
    fail(label, err)
    failed++
    return null
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

console.log(bold('\nPaperless Client — Smoke Test'))
console.log(dim(`  URL   : ${baseUrl}`))
console.log(dim(`  Token : ${token.slice(0, 6)}${'*'.repeat(Math.max(0, token.length - 6))}`))

// Tags
section('Tags')
const tagsPage = await run(
  'list tags',
  () => client.tags.list({ page_size: 5 }),
  (r) => `${r.count} total, showing ${r.results.length}`,
)

if (tagsPage && tagsPage.results.length > 0) {
  const firstTag = tagsPage.results[0]
  await run(
    'get tag',
    () => client.tags.get(firstTag.id),
    (r) => `id=${r.id} name="${r.name}"`,
  )
}

// Correspondents
section('Correspondents')
const correspondentsPage = await run(
  'list correspondents',
  () => client.correspondents.list({ page_size: 5 }),
  (r) => `${r.count} total, showing ${r.results.length}`,
)

if (correspondentsPage && correspondentsPage.results.length > 0) {
  const first = correspondentsPage.results[0]
  await run(
    'get correspondent',
    () => client.correspondents.get(first.id),
    (r) => `id=${r.id} name="${r.name}"`,
  )
}

// Document types
section('Document types')
const docTypesPage = await run(
  'list document types',
  () => client.documentTypes.list({ page_size: 5 }),
  (r) => `${r.count} total, showing ${r.results.length}`,
)

if (docTypesPage && docTypesPage.results.length > 0) {
  const first = docTypesPage.results[0]
  await run(
    'get document type',
    () => client.documentTypes.get(first.id),
    (r) => `id=${r.id} name="${r.name}"`,
  )
}

// Custom fields
section('Custom fields')
await run(
  'list custom fields',
  () => client.customFields.list(),
  (r) => `${r.count} total`,
)

// Documents
section('Documents')
const docsPage = await run(
  'list (raw)',
  () => client.documents.list({ page_size: 5, ordering: '-created' }),
  (r) => `${r.count} total, showing ${r.results.length}`,
)

if (docsPage && docsPage.results.length > 0) {
  const firstDoc = docsPage.results[0]

  await run(
    'get (raw)',
    () => client.documents.get(firstDoc.id),
    (r) => `"${r.title}" correspondent=${r.correspondent ?? 'null'} doc_type=${r.document_type ?? 'null'}`,
  )

  await run(
    'get (resolved)',
    () => client.documents.get(firstDoc.id, { resolve: true }),
    (r) =>
      `correspondent="${r.correspondent?.name ?? 'null'}" doc_type="${r.document_type?.name ?? 'null'}" tags=${r.tags.length}`,
  )

  await run(
    'get (select)',
    () => client.documents.get(firstDoc.id, { select: ['id', 'title', 'created', 'tags'] }),
    (r) => `id=${r.id} title="${r.title}"`,
  )

  await run(
    'list (select)',
    () => client.documents.list({ page_size: 3 }, { select: ['id', 'title', 'correspondent'] }),
    (r) => `${r.results.length} slim docs`,
  )

  await run(
    'list (search)',
    () => client.documents.list({ query: docsPage.results[0].title.split(' ')[0], page_size: 3 }),
    (r) => `${r.count} results for query`,
  )
}

// ── summary ───────────────────────────────────────────────────────────────────

section('Summary')
const total = passed + failed
console.log(`  ${green(`${passed}/${total} passed`)}${failed > 0 ? `   ${red(`${failed} failed`)}` : ''}`)
if (failed === 0) console.log(`\n  ${yellow('All checks passed.')}`)
console.log()

if (failed > 0) process.exit(1)

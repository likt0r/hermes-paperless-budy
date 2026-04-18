# @repo/paperless-client

TypeScript REST client for [Paperless-NGX](https://docs.paperless-ngx.com), built with plain `fetch`. One file per operation, full type safety, and a `resolve` flag that hydrates ID references to full objects.

## Setup

Add the package to any workspace that needs it:

```json
// apps/your-app/package.json
{
  "dependencies": {
    "@repo/paperless-client": "workspace:*"
  }
}
```

Then run `bun install` from the monorepo root.

## Usage

```ts
import { createPaperlessClient } from '@repo/paperless-client'

const client = createPaperlessClient({
  baseUrl: 'https://paperless.example.com',
  token: 'your_api_token',
})
```

The factory returns a namespaced client object. All methods return `Promise` and throw `PaperlessApiError` on non-2xx responses.

---

## Documents

### List

```ts
const page = await client.documents.list(filters?, options?)
```

**`filters`** — `DocumentFilters`

| Field | Type | Description |
|---|---|---|
| `query` | `string` | Full-text search across document content |
| `title` | `string` | Filter by title |
| `correspondent` | `number` | Filter by correspondent ID |
| `document_type` | `number` | Filter by document type ID |
| `tags` | `number[]` | Filter by tag IDs (AND logic) |
| `storage_path` | `number` | Filter by storage path ID |
| `page` | `number` | Page number (1-indexed) |
| `page_size` | `number` | Results per page (default 25) |
| `ordering` | `string` | Sort field — prefix `-` for descending, e.g. `'-created'` |

**`options`** — `{ select?: (keyof DocumentRaw)[] }`

Pass `select` to receive only the specified fields. TypeScript will error at compile time if you access a field you did not select.

```ts
// All fields
const page = await client.documents.list({ query: 'rechnung', page_size: 10 })
page.results[0].correspondent // number | null

// Field selection
const slim = await client.documents.list({ page_size: 50 }, { select: ['id', 'title', 'created'] })
slim.results[0].title    // string   ✓
slim.results[0].content  // Error: 'content' does not exist on type Pick<...>
```

Returns `PaginatedResponse<DocumentRaw | Pick<DocumentRaw, K>>`:
```ts
{
  count: number
  next: string | null
  previous: string | null
  results: DocumentRaw[]
}
```

---

### Get

```ts
const doc = await client.documents.get(id, options?)
```

**`options`** — two mutually exclusive modes:

#### Raw (default)

```ts
const doc = await client.documents.get(42)
// doc.correspondent → number | null
// doc.document_type → number | null
```

With field selection:

```ts
const doc = await client.documents.get(42, { select: ['id', 'title', 'tags'] })
```

#### Resolved (`resolve: true`)

Fetches the correspondent and document type objects in parallel and returns them as full objects instead of IDs.

```ts
const doc = await client.documents.get(42, { resolve: true })
// doc.correspondent → Correspondent | null  (name, slug, etc.)
// doc.document_type → DocumentType | null   (name, slug, etc.)
// doc.tags          → Tag[]                 (always full objects per API)
```

The TypeScript return type is automatically narrowed — no casting required.

---

### Upload

```ts
const { task_id } = await client.documents.upload({
  file: myBlob,
  title: 'Invoice Q1',
  correspondent: 5,
  document_type: 2,
  tags: [1, 3],
  created: '2024-01-15',
})
```

| Field | Type | Required |
|---|---|---|
| `file` | `Blob \| File` | Yes |
| `title` | `string` | No |
| `correspondent` | `number` | No |
| `document_type` | `number` | No |
| `tags` | `number[]` | No |
| `created` | `string` | No — ISO 8601 date |

Returns `{ task_id: string }` — Paperless processes uploads asynchronously.

---

### Update

PATCH any combination of fields:

```ts
const updated = await client.documents.update(42, {
  title: 'Renamed Invoice',
  correspondent: 7,
  tags: [1, 2, 4],
})
```

---

### Delete

```ts
await client.documents.delete(42)
```

---

### Bulk edit

```ts
await client.documents.bulkEdit({
  documents: [1, 2, 3],
  method: 'set_correspondent',
  parameters: { correspondent: 5 },
})
```

Refer to the [Paperless bulk edit docs](https://docs.paperless-ngx.com/api/#tag/documents/operation/documents_bulk_edit_create) for the full list of `method` values and their `parameters`.

---

## Tags

```ts
// List (paginated)
const page = await client.tags.list({ page_size: 100, ordering: 'name' })

// Get single
const tag = await client.tags.get(1)

// Create
const tag = await client.tags.create({ name: 'Rechnung', colour: 2 })

// Update
const tag = await client.tags.update(1, { name: 'Invoice' })

// Delete
await client.tags.delete(1)
```

`TagCreate` / `TagUpdate` fields:

| Field | Type |
|---|---|
| `name` | `string` (required on create) |
| `colour` | `number` |
| `match` | `string` |
| `matching_algorithm` | `number` |
| `is_insensitive` | `boolean` |
| `is_inbox_tag` | `boolean` |
| `owner` | `number \| null` |

---

## Correspondents

```ts
const page  = await client.correspondents.list({ page_size: 50 })
const item  = await client.correspondents.get(3)
const item  = await client.correspondents.create({ name: 'Telekom' })
const item  = await client.correspondents.update(3, { name: 'Deutsche Telekom' })
await client.correspondents.delete(3)
```

---

## Document Types

```ts
const page  = await client.documentTypes.list()
const item  = await client.documentTypes.get(2)
const item  = await client.documentTypes.create({ name: 'Rechnung' })
const item  = await client.documentTypes.update(2, { name: 'Invoice' })
await client.documentTypes.delete(2)
```

---

## Custom Fields

```ts
const page  = await client.customFields.list()
const field = await client.customFields.get(1)
const field = await client.customFields.create({ name: 'Contract value', data_type: 'monetary' })
```

`data_type` values: `'string'` `'integer'` `'float'` `'boolean'` `'date'` `'url'` `'monetary'` `'document_link'`

---

## Error handling

All methods throw `PaperlessApiError` on non-2xx responses.

```ts
import { createPaperlessClient, PaperlessApiError } from '@repo/paperless-client'

try {
  const doc = await client.documents.get(999)
} catch (err) {
  if (err instanceof PaperlessApiError) {
    console.error(err.status) // 404
    console.error(err.body)   // raw response body string
  }
}
```

---

## Exported types

Everything you need is re-exported from the package root:

```ts
import type {
  ClientConfig,
  PaginatedResponse,
  DocumentRaw,
  DocumentResolved,
  DocumentFilters,
  DocumentUploadPayload,
  DocumentPatch,
  DocumentNote,
  BulkEditPayload,
  Tag, TagCreate, TagUpdate, TagFilters,
  Correspondent, CorrespondentCreate, CorrespondentUpdate, CorrespondentFilters,
  DocumentType, DocumentTypeCreate, DocumentTypeUpdate, DocumentTypeFilters,
  CustomField, CustomFieldValue, CustomFieldCreate, CustomFieldDataType, CustomFieldFilters,
  PaperlessClient,
} from '@repo/paperless-client'
```

---

## Smoke test

Copy the env example, fill in your credentials, and run:

```bash
cd packages/paperless-client
cp .env.example .env
# edit .env: set PAPERLESS_URL and PAPERLESS_TOKEN
bun run test
```

The script exercises every resource group and prints pass/fail for each call.

---

## Package structure

```
src/
  index.ts                  createPaperlessClient() factory, re-exports all types
  types/
    config.ts               ClientConfig
    pagination.ts           PaginatedResponse<T>
    document.ts             DocumentRaw, DocumentResolved, DocumentFilters, …
    tag.ts
    correspondent.ts
    document-type.ts
    custom-field.ts
  lib/
    fetch-json.ts           fetchJson(), fetchForm(), PaperlessApiError
    build-query.ts          buildQuery() — filter object → URL query string
    pick-fields.ts          pickFields() — runtime field selection
  documents/
    list-documents.ts
    get-document.ts         overloaded: resolve flag + select
    upload-document.ts
    update-document.ts
    delete-document.ts
    bulk-edit-documents.ts
  tags/                     list · get · create · update · delete
  correspondents/           list · get · create · update · delete
  document-types/           list · get · create · update · delete
  custom-fields/            list · get · create
scripts/
  test-client.ts            smoke test script
```

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

import { buildIterativeSummary, extractAll } from '../src/services/metadata-extractor.js'
import { paperlessClient } from '../src/services/paperless.service.js'
import { model } from '../src/services/ollama.service.js'

// ── helpers ───────────────────────────────────────────────────────────────────

const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

function separator(label: string) {
  console.log(`\n${cyan('─'.repeat(60))}`)
  console.log(bold(cyan(`  ${label}`)))
  console.log(cyan('─'.repeat(60)))
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, terminal: false })
    const lines: string[] = []
    rl.on('line', (line) => lines.push(line))
    rl.on('close', () => resolve(lines.join('\n')))
  })
}

function printField(label: string, value: unknown) {
  const display = Array.isArray(value)
    ? value.join(', ')
    : value == null ? dim('(null)') : String(value)
  console.log(`  ${green('✓')} ${bold(label.padEnd(14))} ${display}`)
}

// ── main ──────────────────────────────────────────────────────────────────────

separator('Hermes — Extraction Test Script')
console.log(dim(`  Model : ${model}`))
console.log(dim(`  Env   : ${path.resolve(__dirname, '..', '.env')}`))
console.log('\nPaste document text, then press Ctrl+D:\n')

const documentText = await readStdin()

if (!documentText.trim()) {
  console.error('No document text provided. Exiting.')
  process.exit(1)
}

console.log(dim(`\nRead ${documentText.length} characters.`))

// ── step 1: reference data ────────────────────────────────────────────────────

separator('Step 1 — Reference data')
const [tagsPage, correspondentsPage, documentTypesPage] = await Promise.all([
  paperlessClient.tags.list(),
  paperlessClient.correspondents.list(),
  paperlessClient.documentTypes.list(),
])
const referenceData = {
  tags: tagsPage.results.map((t) => t.name),
  correspondents: correspondentsPage.results.map((c) => c.name),
  documentTypes: documentTypesPage.results.map((dt) => dt.name),
}
printField('tags', referenceData.tags)
printField('doc types', referenceData.documentTypes)
printField('correspondents', referenceData.correspondents.length ? referenceData.correspondents : dim('(none)'))

// ── step 2: iterative summary ─────────────────────────────────────────────────

separator('Step 2 — Iterative summary')
console.log(dim('  Chunking and summarising…\n'))
const summary = await buildIterativeSummary(documentText)
console.log(yellow(summary))

// ── step 3: sequential chat extraction ───────────────────────────────────────

separator('Step 3 — Sequential chat extraction')
console.log(dim('  Sending tasks one by one in a single chat session…\n'))

const metadata = await extractAll(summary, documentText, referenceData, (field, result) => {
  const raw = result as Record<string, unknown>

  switch (field) {
    case 'title':
      printField('title', raw.title)
      break
    case 'summary':
      printField('summary', raw.summary)
      break
    case 'dateLanguage':
      printField('documentDate', raw.documentDate)
      printField('language', raw.language)
      break
    case 'tags':
      printField('tags', raw.tags)
      break
    case 'documentType':
      printField('documentType', raw.documentType)
      break
    case 'correspondent':
      printField('correspondent', raw.correspondent)
      break
  }
})

// ── result ────────────────────────────────────────────────────────────────────

separator('Result — Full JSON')
console.log(JSON.stringify(metadata, null, 2))
console.log()

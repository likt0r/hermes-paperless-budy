import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '..', '.env') })

const DOCLING_URL = process.env.DOCLING_URL ?? 'http://localhost:5001'

export async function convertPdfToMarkdown(buffer: Buffer): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([buffer], { type: 'application/pdf' })
  formData.append('files', blob, 'document.pdf')
  formData.append('to_formats', 'md')
  formData.append('do_ocr', 'true')
  formData.append('include_images', 'false')
  formData.append('image_export_mode', 'placeholder')

  const res = await fetch(`${DOCLING_URL}/v1/convert/file`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Docling returned ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    document?: { md_content?: string }
    documents?: Array<{ md_content?: string }>
    md_content?: string
  }

  const raw = data.document?.md_content ?? data.documents?.[0]?.md_content ?? data.md_content ?? ''

  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '')
    .replace(/(<!--\s*image\s*-->\s*)+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

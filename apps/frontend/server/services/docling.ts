import { consola } from 'consola'

const logger = consola.withTag('docling')

export async function convertPdfToMarkdown(buffer: Buffer): Promise<string> {
  const { doclingUrl } = useRuntimeConfig()

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' })
  formData.append('files', blob, 'document.pdf')
  formData.append('to_formats', 'md')
  formData.append('do_ocr', 'true')
  formData.append('include_images', 'false')
  formData.append('image_export_mode', 'placeholder')

  logger.info(`Converting PDF (${blob.size} bytes)`)
  const t = Date.now()

  let res: Response
  try {
    res = await fetch(`${doclingUrl}/v1/convert/file`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    logger.error(`Docling fetch failed after ${Date.now() - t}ms: ${err}`)
    throw err
  }

  if (!res.ok) {
    const text = await res.text()
    logger.error(`Docling returned ${res.status} after ${Date.now() - t}ms: ${text.slice(0, 200)}`)
    throw new Error(`Docling returned ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    document?: { md_content?: string }
    documents?: Array<{ md_content?: string }>
    md_content?: string
  }

  const raw = data.document?.md_content ?? data.documents?.[0]?.md_content ?? data.md_content ?? ''

  const result = raw
    .replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '')
    .replace(/(<!--\s*image\s*-->\s*)+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  logger.info(`Converted in ${Date.now() - t}ms → ${result.length} chars`)
  return result
}

import { consola } from 'consola'
import { generate, chatJson } from './ollama'

import {
  iterativeSummarySystemPrompt,
  buildIterativeSummaryPrompt,
  buildExtractMetadataSystem,
  buildExtractTitleMessage,
  buildExtractSummaryMessage,
  buildExtractDateLanguageMessage,
  buildExtractTagsMessage,
  buildExtractDocumentTypeMessage,
  buildExtractCorrespondentMessage,
} from '../prompts/index'

const logger = consola.withTag('metadata-extractor')

export type ReferenceData = {
  tags: string[]
  correspondents: string[]
  documentTypes: string[]
}

const CHUNK_SIZE = 4000
const CHUNK_OVERLAP = 500
const STEP_SIZE = CHUNK_SIZE - CHUNK_OVERLAP

export async function buildIterativeSummary(content: string): Promise<string> {
  if (!content.trim()) return ''

  let runningSummary = 'Keine vorherige Zusammenfassung (Start des Dokuments).'
  const totalChunks = Math.ceil(Math.max(0, content.length - CHUNK_OVERLAP) / STEP_SIZE)
  logger.info(`Summarizing ${totalChunks} chunk(s) (${content.length} chars)`)

  let chunk = 0
  for (let i = 0; i < content.length; i += STEP_SIZE) {
    chunk++
    const chunkContent = content.slice(i, i + CHUNK_SIZE)
    const t = Date.now()
    runningSummary = await generate(
      iterativeSummarySystemPrompt,
      buildIterativeSummaryPrompt(chunkContent, runningSummary),
      { temperature: 0.2 },
    )
    logger.debug(`Chunk ${chunk}/${totalChunks} done in ${Date.now() - t}ms`)
  }

  logger.info(`Summary complete (${runningSummary.length} chars)`)
  return runningSummary
}

export type ExtractedMetadata = {
  title: string | null
  summary: string | null
  tags: string[]
  documentType: string | null
  correspondent: string | null
  documentDate: string | null
  language: string | null
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ProgressCallback = (field: keyof ExtractedMetadata | 'dateLanguage', result: unknown) => void

export async function extractAll(
  summary: string,
  doc: string,
  referenceData: ReferenceData,
  onProgress?: ProgressCallback,
): Promise<ExtractedMetadata> {
  const firstPage = doc.slice(0, 500)
  const lastPage = doc.slice(Math.max(0, doc.length - 500))

  const history: ChatMessage[] = [{ role: 'system', content: buildExtractMetadataSystem(summary, firstPage, lastPage) }]

  async function ask<T>(userContent: string): Promise<T> {
    history.push({ role: 'user', content: userContent })
    const result = await chatJson<T>([...history], { temperature: 0.15 })
    history.push({ role: 'assistant', content: JSON.stringify(result) })
    return result
  }

  const titleResult = await ask<{ title?: string }>(buildExtractTitleMessage())
  onProgress?.('title', titleResult)

  const summaryResult = await ask<{ summary?: string }>(buildExtractSummaryMessage())
  onProgress?.('summary', summaryResult)

  const dateLangResult = await ask<{ documentDate?: string | null; language?: string }>(
    buildExtractDateLanguageMessage(),
  )
  onProgress?.('dateLanguage', dateLangResult)

  const tagsResult = await ask<{ tags?: string[] }>(buildExtractTagsMessage(referenceData.tags))
  onProgress?.('tags', tagsResult)

  const docTypeResult = await ask<{ documentType?: string }>(
    buildExtractDocumentTypeMessage(referenceData.documentTypes),
  )
  onProgress?.('documentType', docTypeResult)

  const correspondentResult = await ask<{ correspondent?: string }>(
    buildExtractCorrespondentMessage(referenceData.correspondents),
  )
  onProgress?.('correspondent', correspondentResult)

  return {
    title: titleResult.title ?? null,
    summary: summaryResult.summary ?? null,
    documentDate: dateLangResult.documentDate ?? null,
    language: dateLangResult.language ?? null,
    tags: Array.isArray(tagsResult.tags) ? tagsResult.tags : [],
    documentType: docTypeResult.documentType ?? null,
    correspondent: correspondentResult.correspondent ?? null,
  }
}

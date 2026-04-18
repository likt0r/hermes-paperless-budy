import type { StreamConfig } from 'motia'
import { z } from 'zod'

const metadataSchema = z.object({
  title: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  documentType: z.string().nullable(),
  correspondent: z.string().nullable(),
  documentDate: z.string().nullable(),
  language: z.string().nullable()
})

export const config: StreamConfig = {
  name: 'extraction',
  schema: z.object({
    status: z.enum(['parsed', 'summarizing', 'summarized', 'extracting', 'done', 'updating', 'updated', 'error']),
    error: z.string().optional(),
    summary: z.string().optional(),
    metadata: metadataSchema.optional()
  }),
  baseConfig: { storageType: 'default' }
}

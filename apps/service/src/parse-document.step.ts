import type { Handlers, StepConfig } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  pdf: z.string(),
});

export const config = {
  name: 'ParseDocument',
  description:
    'Accepts a base64 PDF and returns OCR-extracted markdown via Docling',
  flows: ['document-flow'],
  triggers: [
    {
      type: 'http',
      method: 'POST',
      path: '/parse',
      bodySchema,
      responseSchema: {
        200: z.object({ markdown: z.string() }),
        400: z.object({ error: z.string() }),
        502: z.object({ error: z.string() }),
      },
    },
  ],
  enqueues: [],
} as const satisfies StepConfig;

const DOCLING_URL = process.env.DOCLING_URL ?? 'http://localhost:5001';

export const handler: Handlers<typeof config> = async (
  request,
  { logger },
) => {
  const { pdf: base64Pdf } = request.body;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Pdf, 'base64');
  } catch {
    return {
      status: 400,
      body: { error: 'Invalid base64 PDF content' },
    };
  }

  if (buffer.length === 0) {
    return {
      status: 400,
      body: { error: 'PDF content is empty' },
    };
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('files', blob, 'document.pdf');
  formData.append('to_formats', 'md');
  formData.append('do_ocr', 'true');

  let res: Response;
  try {
    res = await fetch(`${DOCLING_URL}/v1/convert/file`, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Docling request failed', { error: message });
    return {
      status: 502,
      body: { error: `Docling service error: ${message}` },
    };
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error('Docling returned error', {
      status: res.status,
      body: text.slice(0, 500),
    });
    return {
      status: 502,
      body: {
        error: `Docling returned ${res.status}: ${text.slice(0, 200)}`,
      },
    };
  }

  const data = (await res.json()) as {
    document?: { md_content?: string };
    documents?: Array<{ md_content?: string }>;
    md_content?: string;
  };

  const markdown =
    data.document?.md_content ??
    data.documents?.[0]?.md_content ??
    data.md_content ??
    '';

  return {
    status: 200,
    body: { markdown },
  };
};

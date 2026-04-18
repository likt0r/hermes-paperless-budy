import { Ollama } from 'ollama'

export const model = process.env.OLLAMA_MODEL ?? 'ministral-3:8b'
export const defaultTemperature = parseFloat(process.env.OLLAMA_TEMPERATURE ?? '0.15')

export const client = new Ollama({
  host: (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, ''),
})

// Serial queue — only one Ollama request runs at a time; others wait their turn.
let _queue = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = _queue.then(fn)
  _queue = next.then(
    () => {},
    () => {},
  )
  return next
}

export function generate(system: string, prompt: string, options?: { temperature?: number }): Promise<string> {
  return enqueue(async () => {
    const res = await client.generate({
      model,
      prompt,
      system,
      stream: false,
      options: { temperature: options?.temperature ?? defaultTemperature },
    })
    return res.response
  })
}

export async function generateJson<T = unknown>(
  system: string,
  prompt: string,
  options?: { temperature?: number },
): Promise<T> {
  const raw = await enqueue(async () => {
    const res = await client.generate({
      model,
      prompt,
      system,
      stream: false,
      format: 'json',
      options: { temperature: options?.temperature ?? defaultTemperature },
    })
    return res.response
  })
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

export async function chatJson<T = unknown>(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number },
): Promise<T> {
  const raw = await enqueue(async () => {
    const res = await client.chat({
      model,
      messages,
      stream: false,
      format: 'json',
      options: { temperature: options?.temperature ?? defaultTemperature },
    })
    return res.message.content
  })
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

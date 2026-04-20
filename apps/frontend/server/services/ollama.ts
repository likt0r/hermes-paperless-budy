import { consola } from 'consola'
import { Ollama } from 'ollama'

const logger = consola.withTag('ollama')

let _client: Ollama | undefined

function getClient(): Ollama {
  if (!_client) {
    _client = new Ollama({ host: useRuntimeConfig().ollamaUrl.replace(/\/$/, '') })
  }
  return _client
}

function getModel(): string {
  return useRuntimeConfig().ollamaModel
}

function getTemperature(): number {
  return parseFloat(useRuntimeConfig().ollamaTemperature)
}

export async function generate(
  system: string,
  prompt: string,
  options?: { temperature?: number },
): Promise<string> {
  const t = Date.now()
  const res = await getClient().generate({
    model: getModel(),
    prompt,
    system,
    stream: false,
    options: { temperature: options?.temperature ?? getTemperature() },
  })
  logger.debug(`generate: ${res.prompt_eval_count ?? '?'}p + ${res.eval_count ?? '?'}e tokens, ${Date.now() - t}ms`)
  return res.response
}

export async function generateJson<T = unknown>(
  system: string,
  prompt: string,
  options?: { temperature?: number },
): Promise<T> {
  const t = Date.now()
  const res = await getClient().generate({
    model: getModel(),
    prompt,
    system,
    stream: false,
    format: 'json',
    options: { temperature: options?.temperature ?? getTemperature() },
  })
  logger.debug(`generateJson: ${res.prompt_eval_count ?? '?'}p + ${res.eval_count ?? '?'}e tokens, ${Date.now() - t}ms`)
  const cleaned = res.response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

export async function chatJson<T = unknown>(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number },
): Promise<T> {
  const t = Date.now()
  const res = await getClient().chat({
    model: getModel(),
    messages,
    stream: false,
    format: 'json',
    options: { temperature: options?.temperature ?? getTemperature() },
  })
  logger.debug(`chatJson: ${res.prompt_eval_count ?? '?'}p + ${res.eval_count ?? '?'}e tokens, ${Date.now() - t}ms`)
  const cleaned = res.message.content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

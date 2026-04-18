import type { ClientConfig } from '../types/config.js'

export class PaperlessApiError extends Error {
  status: number
  body: string

  constructor(status: number, body: string, url: string) {
    super(`Paperless API error ${status} at ${url}: ${body}`)
    this.name = 'PaperlessApiError'
    this.status = status
    this.body = body
  }
}

export async function fetchJson<T>(config: ClientConfig, path: string, init?: RequestInit): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
      Authorization: `Token ${config.token}`,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new PaperlessApiError(res.status, body, url)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export async function fetchForm<T>(config: ClientConfig, path: string, body: FormData): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${config.token}`,
      // Note: do NOT set Content-Type for FormData — the browser/runtime sets it with the boundary
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new PaperlessApiError(res.status, text, url)
  }
  return res.json() as Promise<T>
}

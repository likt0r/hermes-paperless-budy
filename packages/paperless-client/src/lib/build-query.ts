/**
 * Converts a filter object into a URL query string.
 * Arrays become repeated params: { tags: [1, 2] } → "?tags=1&tags=2"
 * Returns an empty string when filters is empty or nullish.
 */
export function buildQuery(filters?: Record<string, unknown>): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
    } else {
      params.set(key, String(value))
    }
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}

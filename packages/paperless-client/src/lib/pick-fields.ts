/**
 * Returns a new object containing only the specified keys from the source object.
 * Provides runtime enforcement of the TypeScript Pick<T, K> type.
 */
export function pickFields<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

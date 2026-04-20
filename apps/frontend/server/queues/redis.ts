import { Redis } from 'ioredis'

export function createRedisConnection(): Redis {
  return new Redis(useRuntimeConfig().redisUrl, { maxRetriesPerRequest: null })
}

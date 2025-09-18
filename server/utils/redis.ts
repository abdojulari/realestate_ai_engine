import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  // Only initialize Redis if it's available (optional dependency)
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        connectTimeout: 1000,
        lazyConnect: true
      })

      redis.on('error', (err) => {
        console.error('Redis connection error:', err)
        redis = null
      })

      redis.on('connect', () => {
        console.log('✅ Redis connected for caching')
      })

    } catch (error) {
      console.log('⚠️  Redis not available, falling back to no caching')
      redis = null
    }
  }
  
  return redis
}

export async function getCached<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return defaultValue

  try {
    const cached = await client.get(key)
    return cached ? JSON.parse(cached) : defaultValue
  } catch (error) {
    console.warn('Redis get error:', error)
    return defaultValue
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (error) {
    console.warn('Redis set error:', error)
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch (error) {
    console.warn('Redis delete error:', error)
  }
}

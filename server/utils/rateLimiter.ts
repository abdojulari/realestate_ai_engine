import { getRedisClient } from './redis'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (event: any) => string // Custom key generator
}

export async function rateLimit(
  event: any,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const redis = getRedisClient()
  
  // If Redis is not available, allow all requests (graceful degradation)
  if (!redis) {
    return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs }
  }

  try {
    // Generate rate limit key
    const clientIP = getClientIP(event)
    const key = config.keyGenerator 
      ? config.keyGenerator(event)
      : `rate_limit:${clientIP}:${event.node.req.url}`

    const now = Date.now()
    const windowStart = now - config.windowMs

    // Use Redis sorted set to track requests in time window
    const pipe = redis.pipeline()
    
    // Remove expired entries
    pipe.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests in window
    pipe.zcard(key)
    
    // Add current request
    pipe.zadd(key, now, `${now}-${Math.random()}`)
    
    // Set expiration for cleanup
    pipe.expire(key, Math.ceil(config.windowMs / 1000))
    
    const results = await pipe.exec()
    const requestCount = (results?.[1]?.[1] as number) || 0

    const allowed = requestCount < config.maxRequests
    const remaining = Math.max(0, config.maxRequests - requestCount - 1)
    const resetTime = now + config.windowMs

    return { allowed, remaining, resetTime }
  } catch (error) {
    console.warn('Rate limiting error:', error)
    // On error, allow the request (fail open)
    return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs }
  }
}

function getClientIP(event: any): string {
  const headers = event.node.req.headers
  
  // Check common headers for client IP
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
  }
  
  const realIP = headers['x-real-ip']
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP
  }
  
  const cfConnectingIP = headers['cf-connecting-ip']
  if (cfConnectingIP) {
    return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP
  }
  
  // Fallback to socket address
  return event.node.req.socket?.remoteAddress || 'unknown'
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Very strict for form submissions to prevent spam
  estimates: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3 // 3 estimates per 15 minutes per IP
  },
  
  // Moderate for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute per IP
  },
  
  // Lenient for admin endpoints (authenticated users)
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200 // 200 requests per minute per IP
  },
  
  // Very strict for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per 15 minutes per IP
  }
}

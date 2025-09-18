import { defineEventHandler, setHeader } from 'h3'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  // Generate unique request ID
  const requestId = randomUUID()
  
  // Add request ID to event context for use in other middleware/endpoints
  event.context.requestId = requestId
  
  // Add request ID to response headers for client debugging
  setHeader(event, 'X-Request-ID', requestId)
  
  // Log request start with ID
  const startTime = Date.now()
  const method = event.node.req.method
  const url = event.node.req.url
  const userAgent = event.node.req.headers['user-agent']
  const clientIP = getClientIP(event)
  
  console.log(`[${requestId}] ${method} ${url} - ${clientIP} - ${userAgent}`)
  
  // Store start time for duration calculation
  event.context.startTime = startTime
  
  // Log response when request completes
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusCode = event.node.res.statusCode
    
    console.log(`[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`)
  })
})

function getClientIP(event: any): string {
  const headers = event.node.req.headers
  
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
  
  return event.node.req.socket?.remoteAddress || 'unknown'
}

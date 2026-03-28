import { defineEventHandler, createError, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  const method = event.node.req.method || ''
  
  console.log(`[AUTH MIDDLEWARE] Processing: ${method} ${url}`)
  
  // Skip auth check for auth routes and public routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/resend-2fa',
    '/api/auth/verify-2fa',
    '/api/auth/google',
    '/api/auth/google/callback',
    // Admin content management endpoints (whitelisted)
    '/api/admin/content',
    '/api/admin/content/upload',
    '/api/admin/content/upload-about-images',
    '/api/admin/content/sections',
    // CREA sync endpoints (for scripts and scheduled tasks - uses CREA API credentials)
    '/api/crea/sync-alberta',
    '/api/crea/sync-province',
    '/api/crea/sync-with-agents',
    '/api/crea/count',
    // Service worker endpoints for scheduled CREA sync
    '/api/admin/settings/crea-sync',
    '/api/admin/crea/background-sync',
    '/api/admin/crea/purge',
    '/api/admin/crea/cleanup-broken',
    // Pillar9 sync endpoints (for scripts and scheduled tasks)
    '/api/admin/settings/pillar9-sync',
    '/api/admin/pillar9/sync-status',
    '/api/admin/pillar9/sync',
    // Public features that don't require authentication
    '/api/ai/parse-property-query',
    '/api/market-insights',
    '/api/chat',
    '/api/chat/lead',
    '/api/news/feed',
    '/api/stats',
    // Site settings (public - for home page template selection)
    '/api/settings/home-template',
    // Newsletter subscription (public - no login required)
    '/api/newsletter/subscribe',
    '/api/newsletter/unsubscribe',
    // Alert scheduler endpoint (protected by secret in handler)
    '/api/alerts/run-due',
    // License endpoint (internal use, no auth required)
    '/api/license',
    // Tenant settings (public - for branding, social links, contact info)
    '/api/tenant-settings',
    // User provisioning from SaaS control plane (uses API key auth)
    '/api/users/provision'
  ]

  // Skip auth for non-API routes (pages, assets, etc.)
  if (!url.startsWith('/api/')) {
    return
  }
  
  // Check if it's a public API route
  const matchingRoute = publicRoutes.find(route => url.startsWith(route))
  if (matchingRoute) {
    return
  }
  
  // Allow GET requests to public API endpoints
  if (event.node.req.method === 'GET' && (
    url.startsWith('/api/properties') ||
    url.startsWith('/api/content') ||
    url.startsWith('/api/testimonials') ||
    url.startsWith('/api/team') ||
    url.startsWith('/api/neighborhoods') ||
    url.startsWith('/api/blog')
  )) {
    return
  }

  // Public lead capture forms (GET form data + POST submissions)
  if (url.startsWith('/api/lead-form/')) {
    return
  }

  console.log(`[AUTH MIDDLEWARE] 🔒 Checking auth for: ${url}`)

  try {
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[Auth Middleware] No token provided for ${url}`)
      console.error('[Auth Middleware] Authorization header:', authHeader)
      throw createError({
        statusCode: 401,
        statusMessage: 'No token provided. Please log in again.'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      console.error('[Auth Middleware] Invalid token format')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token format. Please log in again.'
      })
    }
    
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    let decoded: any
    
    try {
      decoded = jwt.verify(token, secret) as { id: number, email: string, role?: string }
    } catch (jwtError: any) {
      console.error('[Auth Middleware] JWT verification failed:', jwtError.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Token expired or invalid. Please log in again.'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        adminId: true,
        subscriptionTier: true,
      }
    })

    if (!user) {
      console.error(`[Auth Middleware] User not found: ${decoded.id}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Add user to event context
    event.context.user = user
    console.log(`[AUTH MIDDLEWARE] ✅ User authenticated: ${user.email} (${user.role}) for ${url}`)

  } catch (error: any) {
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }
    
    // Otherwise, throw a generic error
    console.error('[Auth Middleware] Unexpected error:', error)
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication failed. Please log in again.'
    })
  }
})
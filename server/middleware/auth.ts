import { defineEventHandler, createError, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Debug logging
  const url = event.node.req.url
  console.log(`[AUTH MIDDLEWARE] Processing: ${event.node.req.method} ${url}`)
  
  // Skip auth check for auth routes and public routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/me',
    '/api/auth/google',
    '/api/auth/google/callback',
    // Allow SSR to render public pages without token
    '/',
    '/selling',
    '/buying',
    '/seller/homeestimate',
    '/seller',
    '/contact',
    '/map-search',
    '/properties',
    '/about',
    '/terms',
    '/privacy'
  ]

  // Skip auth check for non-API routes or public routes
  if (!event.node.req.url?.startsWith('/api/') || 
      publicRoutes.some(route => event.node.req.url?.startsWith(route)) ||
      (event.node.req.method === 'GET' && (
        event.node.req.url?.startsWith('/api/properties') ||
        event.node.req.url?.startsWith('/api/content')
      ))) {
    console.log(`[AUTH MIDDLEWARE] Skipping auth for: ${url}`)
    return
  }

  console.log(`[AUTH MIDDLEWARE] Checking auth for: ${url}`)

  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token format'
      })
    }
    
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, secret) as { id: number, email: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Add user to event context
    event.context.user = user
    console.log(`[AUTH MIDDLEWARE] User set in context: ${user.email} (${user.role})`)

  } catch (error: any) {
    console.log(`[AUTH MIDDLEWARE] Auth failed for ${url}:`, error.message)
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
})
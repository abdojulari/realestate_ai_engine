import { defineEventHandler, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get All Blog Tags
 * GET /api/blog/tags
 * 
 * Returns all tags with post counts
 * Aggregated from published posts
 */
export default defineEventHandler(async (event) => {
  try {
    const tags = await prisma.blogTag.findMany({
      orderBy: [
        { postCount: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        postCount: true
      }
    })
    
    // Set caching headers (1 hour cache for tags)
    setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400')
    
    return { tags }
  } catch (error) {
    console.error('[Blog API] Error fetching tags:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch tags'
    })
  }
})

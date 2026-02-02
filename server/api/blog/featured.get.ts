import { defineEventHandler, getQuery, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get Featured Blog Posts
 * GET /api/blog/featured
 * 
 * Returns featured published posts for homepage/sidebar
 * Limited to prevent overloading
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 5, 10)
  
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        isFeatured: true
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        coverImageAlt: true,
        publishedAt: true,
        readTime: true,
        category: {
          select: {
            name: true,
            slug: true,
            color: true
          }
        }
      }
    })
    
    // Set caching headers (15 minutes cache)
    setHeader(event, 'Cache-Control', 'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400')
    
    return { posts }
  } catch (error) {
    console.error('[Blog API] Error fetching featured posts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch featured posts'
    })
  }
})

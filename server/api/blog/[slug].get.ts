import { defineEventHandler, getRouterParams, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Get Single Blog Post by Slug
 * GET /api/blog/:slug
 * 
 * Returns full post content for public viewing
 * Increments view count
 * Includes related posts suggestion
 */
export default defineEventHandler(async (event) => {
  const { slug } = getRouterParams(event)
  
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required'
    })
  }
  
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    // Fetch the post
    const post = await prisma.blogPost.findFirst({
      where: { slug, ...tenantFilter },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true
          }
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true
          }
        }
      }
    })
    
    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Blog post not found'
      })
    }
    
    // Only show published posts publicly
    if (post.status !== 'published' || (post.publishedAt && post.publishedAt > new Date())) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Blog post not found'
      })
    }
    
    // Increment view count asynchronously (non-blocking)
    prisma.blogPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } }
    }).catch(err => console.error('[Blog] View increment error:', err))
    
    // Fetch related posts (same category, excluding current)
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        ...tenantFilter,
        status: 'published',
        publishedAt: { lte: new Date() },
        id: { not: post.id },
        ...(post.categoryId ? { categoryId: post.categoryId } : {})
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
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
    
    // Set caching headers for SEO (10 minutes cache for individual posts)
    setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=1200, stale-while-revalidate=86400')
    
    return {
      post: {
        ...post,
        views: post.views + 1 // Return incremented count
      },
      relatedPosts
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Blog API] Error fetching post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch blog post'
    })
  }
})

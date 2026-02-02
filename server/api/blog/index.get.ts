import { defineEventHandler, getQuery, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Public Blog Posts API
 * GET /api/blog
 * 
 * Supports:
 * - Pagination: page, limit
 * - Filtering: category, tag, featured, search
 * - Sorting: sort (latest, oldest, popular)
 * 
 * Returns only published posts for public consumption
 * Includes caching headers for SEO optimization
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  // Pagination
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 12, 50) // Max 50 per page
  const skip = (page - 1) * limit
  
  // Filters
  const categorySlug = query.category as string
  const tag = query.tag as string
  const featured = query.featured === 'true'
  const search = query.search as string
  
  // Sorting
  const sort = (query.sort as string) || 'latest'
  
  // Build where clause - only published posts
  const where: any = {
    status: 'published',
    publishedAt: { lte: new Date() }
  }
  
  // Category filter
  if (categorySlug) {
    const category = await prisma.blogCategory.findUnique({
      where: { slug: categorySlug }
    })
    if (category) {
      where.categoryId = category.id
    }
  }
  
  // Tag filter (JSON array contains)
  if (tag) {
    where.tags = {
      array_contains: [tag]
    }
  }
  
  // Featured filter
  if (featured) {
    where.isFeatured = true
  }
  
  // Search filter
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  // Build orderBy
  let orderBy: any = { publishedAt: 'desc' }
  switch (sort) {
    case 'oldest':
      orderBy = { publishedAt: 'asc' }
      break
    case 'popular':
      orderBy = { views: 'desc' }
      break
    case 'latest':
    default:
      orderBy = { publishedAt: 'desc' }
  }
  
  try {
    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy,
        skip,
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
          views: true,
          isFeatured: true,
          tags: true,
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
              avatar: true
            }
          }
        }
      }),
      prisma.blogPost.count({ where })
    ])
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    // Set caching headers for SEO (5 minutes cache)
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
    
    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  } catch (error) {
    console.error('[Blog API] Error fetching posts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch blog posts'
    })
  }
})

import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Admin Blog Posts List
 * GET /api/admin/blog
 * 
 * Returns all posts (including drafts) for admin management
 * Requires admin authentication
 * Tenant-scoped: admin sees own posts, super_admin sees all
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const query = getQuery(event)
  
  // Pagination
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)
  const skip = (page - 1) * limit
  
  // Filters
  const status = query.status as string
  const categoryId = query.categoryId ? parseInt(query.categoryId as string) : undefined
  const search = query.search as string
  const authorId = query.authorId ? parseInt(query.authorId as string) : undefined
  
  // Build where clause with tenant scoping
  const where: any = {
    ...tenantFilter
  }
  
  if (status && status !== 'all') {
    where.status = status
  }
  
  if (categoryId) {
    where.categoryId = categoryId
  }
  
  if (authorId) {
    where.authorId = authorId
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  try {
    const [posts, total, statusCounts] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true
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
      prisma.blogPost.count({ where }),
      // Get counts by status – scoped to tenant
      prisma.blogPost.groupBy({
        by: ['status'],
        where: { ...tenantFilter },
        _count: true
      })
    ])
    
    // Format status counts
    const counts = {
      all: 0,
      draft: 0,
      published: 0,
      scheduled: 0,
      archived: 0
    }
    
    statusCounts.forEach(s => {
      counts[s.status as keyof typeof counts] = s._count
      counts.all += s._count
    })
    
    const totalPages = Math.ceil(total / limit)
    
    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      counts
    }
  } catch (error) {
    console.error('[Admin Blog API] Error fetching posts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch blog posts'
    })
  }
})

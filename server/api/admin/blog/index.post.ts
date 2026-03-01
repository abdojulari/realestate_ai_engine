import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Create Blog Post
 * POST /api/admin/blog
 * 
 * Creates a new blog post (draft or published)
 * Requires admin authentication
 * Tenant-scoped: assigns adminId for data isolation
 */

// Helper to generate slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

// Helper to calculate read time
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)
  
  const body = await readBody(event)
  
  // Validate required fields
  if (!body.title || !body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title and content are required'
    })
  }
  
  try {
    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.title)
    
    // Check for slug uniqueness
    const existingPost = await prisma.blogPost.findFirst({
      where: { slug, adminId: getAdminIdForCreate(user) }
    })
    
    if (existingPost) {
      // Append timestamp for uniqueness
      slug = `${slug}-${Date.now()}`
    }
    
    // Calculate read time
    const readTime = calculateReadTime(body.content)
    
    // Determine publish date
    let publishedAt = null
    let status = body.status || 'draft'
    
    if (status === 'published') {
      publishedAt = new Date()
    } else if (status === 'scheduled' && body.scheduledAt) {
      publishedAt = null
    }
    
    // Handle tags - ensure they're stored and tracked
    const tags = body.tags || []
    if (tags.length > 0) {
      // Upsert tags with tenant scoping
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        await prisma.blogTag.upsert({
          where: { slug: tagSlug } as any,
          create: {
            name: tagName,
            slug: tagSlug,
            postCount: 1,
            adminId
          },
          update: {
            postCount: { increment: 1 }
          }
        })
      }
    }
    
    // Validate category belongs to tenant if provided
    if (body.categoryId) {
      const category = await prisma.blogCategory.findFirst({
        where: { id: body.categoryId, ...tenantFilter }
      })
      if (!category) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Category not found or does not belong to your tenant'
        })
      }
    }
    
    // Create the post with tenant adminId
    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt || null,
        content: body.content,
        contentHtml: body.contentHtml || null,
        coverImage: body.coverImage || null,
        coverImageAlt: body.coverImageAlt || null,
        authorId: user.id,
        adminId,
        categoryId: body.categoryId || null,
        tags: tags,
        status,
        publishedAt,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        isFeatured: body.isFeatured || false,
        allowComments: body.allowComments !== false,
        readTime,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        metaKeywords: body.metaKeywords || null,
        canonicalUrl: body.canonicalUrl || null,
        ogImage: body.ogImage || null,
        syncToHashnode: body.syncToHashnode || false
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    // Update category post count if assigned
    if (body.categoryId) {
      await prisma.blogCategory.update({
        where: { id: body.categoryId },
        data: { postCount: { increment: 1 } }
      })
    }
    
    return {
      success: true,
      post
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error creating post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create blog post'
    })
  }
})

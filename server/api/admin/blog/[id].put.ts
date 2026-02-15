import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Update Blog Post
 * PUT /api/admin/blog/:id
 * 
 * Updates an existing blog post
 * Requires admin authentication
 * Tenant-scoped: verifies ownership before update
 */

// Helper to calculate read time
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  
  const { id } = getRouterParams(event) as { id: string }
  const postId = parseInt(id)
  
  if (!postId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid post ID is required'
    })
  }
  
  const body = await readBody(event)
  
  try {
    // Fetch existing post with tenant scoping
    const existingPost = await prisma.blogPost.findFirst({
      where: { id: postId, ...tenantFilter }
    })
    
    if (!existingPost) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Blog post not found'
      })
    }
    
    // Verify tenant access
    requireTenantAccess(user, existingPost.adminId)
    
    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }
    
    // Handle title update
    if (body.title !== undefined) {
      updateData.title = body.title
    }
    
    // Handle slug update (check uniqueness)
    if (body.slug !== undefined && body.slug !== existingPost.slug) {
      const slugExists = await prisma.blogPost.findFirst({
        where: {
          slug: body.slug,
          id: { not: postId },
          ...tenantFilter
        }
      })
      
      if (slugExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Slug already exists'
        })
      }
      
      updateData.slug = body.slug
    }
    
    // Handle content updates
    if (body.content !== undefined) {
      updateData.content = body.content
      updateData.readTime = calculateReadTime(body.content)
    }
    
    if (body.contentHtml !== undefined) {
      updateData.contentHtml = body.contentHtml
    }
    
    if (body.excerpt !== undefined) {
      updateData.excerpt = body.excerpt
    }
    
    // Handle image updates
    if (body.coverImage !== undefined) {
      updateData.coverImage = body.coverImage
    }
    
    if (body.coverImageAlt !== undefined) {
      updateData.coverImageAlt = body.coverImageAlt
    }
    
    // Handle category change – validate category belongs to tenant
    if (body.categoryId !== undefined && body.categoryId !== existingPost.categoryId) {
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
      
      // Decrement old category count
      if (existingPost.categoryId) {
        await prisma.blogCategory.update({
          where: { id: existingPost.categoryId },
          data: { postCount: { decrement: 1 } }
        })
      }
      
      // Increment new category count
      if (body.categoryId) {
        await prisma.blogCategory.update({
          where: { id: body.categoryId },
          data: { postCount: { increment: 1 } }
        })
      }
      
      updateData.categoryId = body.categoryId
    }
    
    // Handle tags update
    if (body.tags !== undefined) {
      const oldTags = (existingPost.tags as string[]) || []
      const newTags = body.tags || []
      
      // Decrement counts for removed tags
      const removedTags = oldTags.filter(t => !newTags.includes(t))
      for (const tagName of removedTags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        await prisma.blogTag.updateMany({
          where: { slug: tagSlug, ...tenantFilter },
          data: { postCount: { decrement: 1 } }
        })
      }
      
      // Add/increment new tags
      const addedTags = newTags.filter((t: string) => !oldTags.includes(t))
      for (const tagName of addedTags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        await prisma.blogTag.upsert({
          where: { slug: tagSlug } as any,
          create: {
            name: tagName,
            slug: tagSlug,
            postCount: 1,
            adminId: existingPost.adminId
          },
          update: {
            postCount: { increment: 1 }
          }
        })
      }
      
      updateData.tags = newTags
    }
    
    // Handle status change
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Set publishedAt when first published
      if (body.status === 'published' && existingPost.status !== 'published') {
        updateData.publishedAt = new Date()
      }
    }
    
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    }
    
    // Handle boolean flags
    if (body.isFeatured !== undefined) {
      updateData.isFeatured = body.isFeatured
    }
    
    if (body.allowComments !== undefined) {
      updateData.allowComments = body.allowComments
    }
    
    // Handle SEO fields
    if (body.metaTitle !== undefined) {
      updateData.metaTitle = body.metaTitle
    }
    
    if (body.metaDescription !== undefined) {
      updateData.metaDescription = body.metaDescription
    }
    
    if (body.metaKeywords !== undefined) {
      updateData.metaKeywords = body.metaKeywords
    }
    
    if (body.canonicalUrl !== undefined) {
      updateData.canonicalUrl = body.canonicalUrl
    }
    
    if (body.ogImage !== undefined) {
      updateData.ogImage = body.ogImage
    }
    
    // Handle Hashnode sync settings
    if (body.syncToHashnode !== undefined) {
      updateData.syncToHashnode = body.syncToHashnode
    }
    
    // Update the post
    const post = await prisma.blogPost.update({
      where: { id: postId },
      data: updateData,
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
    
    return {
      success: true,
      post
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error updating post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update blog post'
    })
  }
})

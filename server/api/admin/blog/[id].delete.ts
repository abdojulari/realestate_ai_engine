import { defineEventHandler, getRouterParams } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Delete Blog Post
 * DELETE /api/admin/blog/:id
 * 
 * Permanently deletes a blog post
 * Requires admin authentication
 * Tenant-scoped: verifies ownership before deletion
 */
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
    
    // Decrement category count
    if (existingPost.categoryId) {
      await prisma.blogCategory.update({
        where: { id: existingPost.categoryId },
        data: { postCount: { decrement: 1 } }
      })
    }
    
    // Decrement tag counts (scoped to tenant)
    const tags = (existingPost.tags as string[]) || []
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await prisma.blogTag.updateMany({
        where: { slug: tagSlug, ...tenantFilter },
        data: { postCount: { decrement: 1 } }
      })
    }
    
    // Delete the post
    await prisma.blogPost.delete({
      where: { id: postId }
    })
    
    return {
      success: true,
      message: 'Blog post deleted successfully'
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error deleting post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete blog post'
    })
  }
})

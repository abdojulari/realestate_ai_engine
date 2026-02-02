import { defineEventHandler, getRouterParams } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Delete Blog Post
 * DELETE /api/admin/blog/:id
 * 
 * Permanently deletes a blog post
 * Requires admin authentication
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  
  if (!user || user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }
  
  const { id } = getRouterParams(event)
  const postId = parseInt(id)
  
  if (!postId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid post ID is required'
    })
  }
  
  try {
    // Fetch existing post
    const existingPost = await prisma.blogPost.findUnique({
      where: { id: postId }
    })
    
    if (!existingPost) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Blog post not found'
      })
    }
    
    // Decrement category count
    if (existingPost.categoryId) {
      await prisma.blogCategory.update({
        where: { id: existingPost.categoryId },
        data: { postCount: { decrement: 1 } }
      })
    }
    
    // Decrement tag counts
    const tags = (existingPost.tags as string[]) || []
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await prisma.blogTag.updateMany({
        where: { slug: tagSlug },
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

import { defineEventHandler, getRouterParams } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get Single Blog Post for Editing
 * GET /api/admin/blog/:id
 * 
 * Returns full post data including drafts for admin editing
 */
export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const postId = parseInt(id)
  
  if (!postId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid post ID is required'
    })
  }
  
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
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
    
    return { post }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error fetching post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch blog post'
    })
  }
})

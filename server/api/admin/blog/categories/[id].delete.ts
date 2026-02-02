import { defineEventHandler, getRouterParams } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Delete Blog Category
 * DELETE /api/admin/blog/categories/:id
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
  const categoryId = parseInt(id)
  
  if (!categoryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid category ID is required'
    })
  }
  
  try {
    const existing = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: { select: { posts: true } }
      }
    })
    
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Category not found'
      })
    }
    
    if (existing._count.posts > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot delete category with ${existing._count.posts} posts. Reassign or delete posts first.`
      })
    }
    
    await prisma.blogCategory.delete({
      where: { id: categoryId }
    })
    
    return {
      success: true,
      message: 'Category deleted successfully'
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error deleting category:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete category'
    })
  }
})

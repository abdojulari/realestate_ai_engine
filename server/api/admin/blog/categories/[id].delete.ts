import { defineEventHandler, getRouterParams } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Delete Blog Category
 * DELETE /api/admin/blog/categories/:id
 * 
 * Tenant-scoped: verifies ownership before deletion
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  
  const { id } = getRouterParams(event) as { id: string }
  const categoryId = parseInt(id)
  
  if (!categoryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid category ID is required'
    })
  }
  
  try {
    // Fetch existing category with tenant scoping
    const existing = await prisma.blogCategory.findFirst({
      where: { id: categoryId, ...tenantFilter },
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
    
    // Verify tenant access
    requireTenantAccess(user, existing.adminId)
    
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

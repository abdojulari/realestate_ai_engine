import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Update Blog Category
 * PUT /api/admin/blog/categories/:id
 * 
 * Tenant-scoped: verifies ownership before update
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
  
  const body = await readBody(event)
  
  try {
    // Fetch existing category with tenant scoping
    const existing = await prisma.blogCategory.findFirst({
      where: { id: categoryId, ...tenantFilter }
    })
    
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Category not found'
      })
    }
    
    // Verify tenant access
    requireTenantAccess(user, existing.adminId)
    
    // Check slug uniqueness if changing (within tenant scope)
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.blogCategory.findFirst({
        where: {
          slug: body.slug,
          id: { not: categoryId },
          ...tenantFilter
        }
      })
      
      if (slugExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Slug already exists'
        })
      }
    }
    
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.description !== undefined) updateData.description = body.description
    if (body.color !== undefined) updateData.color = body.color
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.parentId !== undefined) updateData.parentId = body.parentId
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    
    const category = await prisma.blogCategory.update({
      where: { id: categoryId },
      data: updateData
    })
    
    return {
      success: true,
      category
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error updating category:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update category'
    })
  }
})

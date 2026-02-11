import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Update Blog Category
 * PUT /api/admin/blog/categories/:id
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
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
  
  const body = await readBody(event)
  
  try {
    const existing = await prisma.blogCategory.findUnique({
      where: { id: categoryId }
    })
    
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Category not found'
      })
    }
    
    // Check slug uniqueness if changing
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.blogCategory.findFirst({
        where: {
          slug: body.slug,
          id: { not: categoryId }
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

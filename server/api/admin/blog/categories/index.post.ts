import { defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create Blog Category
 * POST /api/admin/blog/categories
 * 
 * Creates a new blog category
 */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }
  
  const body = await readBody(event)
  
  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Category name is required'
    })
  }
  
  try {
    // Generate slug
    const slug = body.slug || generateSlug(body.name)
    
    // Check for existing
    const existing = await prisma.blogCategory.findFirst({
      where: {
        OR: [
          { name: body.name },
          { slug }
        ]
      }
    })
    
    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Category with this name or slug already exists'
      })
    }
    
    const category = await prisma.blogCategory.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        color: body.color || '#1976D2',
        icon: body.icon || 'mdi-folder',
        parentId: body.parentId || null,
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive !== false
      }
    })
    
    return {
      success: true,
      category
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Admin Blog API] Error creating category:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create category'
    })
  }
})

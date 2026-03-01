import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Create Blog Category
 * POST /api/admin/blog/categories
 * 
 * Creates a new blog category
 * Tenant-scoped: assigns adminId for data isolation
 */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)
  
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
    
    // Check for existing within tenant scope
    const existing = await prisma.blogCategory.findFirst({
      where: {
        ...tenantFilter,
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
        isActive: body.isActive !== false,
        adminId
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

import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Admin Get All Categories
 * GET /api/admin/blog/categories
 * 
 * Returns all categories including inactive ones for admin management
 * Tenant-scoped: admin sees own categories, super_admin sees all
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'
  
  try {
    const where: any = { ...tenantFilter }
    if (!includeInactive) {
      where.isActive = true
    }
    
    const categories = await prisma.blogCategory.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
    
    return { categories }
  } catch (error) {
    console.error('[Admin Blog API] Error fetching categories:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch categories'
    })
  }
})

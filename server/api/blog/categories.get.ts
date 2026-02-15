import { defineEventHandler, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Get All Blog Categories
 * GET /api/blog/categories
 * 
 * Returns active categories with post counts
 * Sorted by sort order for navigation
 */
export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    const categories = await prisma.blogCategory.findMany({
      where: { ...tenantFilter, isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        icon: true,
        postCount: true,
        parentId: true
      }
    })
    
    // Build hierarchy if there are parent/child relationships
    const rootCategories = categories.filter(c => !c.parentId)
    const categoriesWithChildren = rootCategories.map(parent => ({
      ...parent,
      children: categories.filter(c => c.parentId === parent.id)
    }))
    
    // Set caching headers (1 hour cache for categories)
    setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400')
    
    return {
      categories: categoriesWithChildren,
      flat: categories
    }
  } catch (error) {
    console.error('[Blog API] Error fetching categories:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch categories'
    })
  }
})

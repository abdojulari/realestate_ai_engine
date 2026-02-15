import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const category = query.category as string || undefined
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined
    const skip = (page - 1) * limit

    const where: any = { ...tenantFilter }
    if (category) where.category = category
    if (isActive !== undefined) where.isActive = isActive

    const [templates, total] = await Promise.all([
      prisma.newsletterTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { newsletters: true } } }
      }),
      prisma.newsletterTemplate.count({ where })
    ])

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const type = query.type as string
    const status = query.status as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }
    if (type) where.type = type
    if (status) where.status = status
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.crmClient.findMany({
        where,
        include: {
          transactions: {
            select: { id: true, type: true, status: true, progress: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.crmClient.count({ where })
    ])

    // Get type counts
    const typeCounts = await prisma.crmClient.groupBy({
      by: ['type'],
      where: { ...tenantFilter },
      _count: true
    })

    return {
      clients,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: {
        total,
        byType: typeCounts.reduce((acc, tc) => {
          acc[tc.type] = tc._count
          return acc
        }, {} as Record<string, number>)
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const status = query.status as string || undefined
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [campaigns, total] = await Promise.all([
      prisma.newsletter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
          _count: { select: { sentNewsletters: true } }
        }
      }),
      prisma.newsletter.count({ where })
    ])

    const stats = await prisma.newsletter.groupBy({
      by: ['status'],
      _count: true
    })

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: stats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count
        return acc
      }, {})
    }
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

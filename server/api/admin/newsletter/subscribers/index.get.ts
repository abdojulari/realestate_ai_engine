import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const status = query.status as string || undefined
    const search = query.search as string || undefined
    const skip = (page - 1) * limit

    const where: any = { ...tenantFilter }
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
        include: { _count: { select: { sentNewsletters: true } } }
      }),
      prisma.newsletterSubscriber.count({ where })
    ])

    const stats = await prisma.newsletterSubscriber.groupBy({
      by: ['status'],
      where: { ...tenantFilter },
      _count: true
    })

    return {
      subscribers,
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
    console.error('Error fetching subscribers:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

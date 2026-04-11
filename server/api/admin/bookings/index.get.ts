import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const status = query.status as string
    const type = query.type as string
    const from = query.from as string
    const to = query.to as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20

    const where: any = { ...tenantFilter }
    if (status) where.status = status
    if (type) where.type = type
    if (from || to) {
      where.dateTime = {}
      if (from) where.dateTime.gte = new Date(from)
      if (to) where.dateTime.lte = new Date(to)
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { dateTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where })
    ])

    return {
      bookings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

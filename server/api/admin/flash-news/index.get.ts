import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const query = getQuery(event)

  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const skip = (page - 1) * limit

  const where: any = { ...tenantFilter }

  const status = query.status as string
  if (status === 'published') where.published = true
  else if (status === 'draft') where.published = false

  try {
    const [items, total] = await Promise.all([
      prisma.flashNews.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.flashNews.count({ where }),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('[Admin FlashNews] Error fetching:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch flash news' })
  }
})

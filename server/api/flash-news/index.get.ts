import { defineEventHandler, setHeader } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const now = new Date()

    const items = await prisma.flashNews.findMany({
      where: {
        ...tenantFilter,
        published: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        headline: true,
        slug: true,
        ctaLabel: true,
        ctaUrl: true,
      },
    })

    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')

    return { items }
  } catch (error) {
    console.error('[FlashNews Public] Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch flash news' })
  }
})

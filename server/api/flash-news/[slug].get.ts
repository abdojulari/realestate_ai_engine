import { defineEventHandler, getRouterParams, setHeader } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const { slug } = getRouterParams(event)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const now = new Date()

    const item = await prisma.flashNews.findFirst({
      where: {
        slug,
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
    })

    if (!item) {
      throw createError({ statusCode: 404, statusMessage: 'Flash news not found' })
    }

    setHeader(event, 'Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600')

    return { item }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[FlashNews Public] Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch flash news' })
  }
})

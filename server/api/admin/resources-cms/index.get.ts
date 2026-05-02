/**
 * GET /api/admin/resources-cms
 *
 * Lists ALL resources for the current tenant (drafts + published, featured
 * or not) ordered by sortOrder for drag-to-reorder. The admin UI shows
 * everything; only featured+published rows actually surface on the public
 * homepage carousel (see /api/public/learn/featured.get.ts).
 */
import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const rows = await prisma.resource.findMany({
    where: { ...tenantFilter },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      excerpt: true,
      coverImage: true,
      sourceName: true,
      sourceUrl: true,
      externalLinks: true,
      category: true,
      featured: true,
      sortOrder: true,
      published: true,
      publishedAt: true,
      viewCount: true,
      unlockCount: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { leads: true } },
    },
  })

  // Featured-and-published count drives the "X / 4 visible on homepage" UI hint.
  const liveCount = rows.filter((r) => r.featured && r.published).length

  return {
    success: true,
    resources: rows.map((r) => ({
      ...r,
      leadCount: (r as any)._count?.leads ?? 0,
    })),
    summary: {
      total: rows.length,
      featuredLive: liveCount,
      featuredCap: 4,
    },
  }
})

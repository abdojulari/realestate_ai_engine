/**
 * GET /api/public/learn/featured
 *
 * Public endpoint feeding the homepage carousel (ResourcesSection.vue).
 * Returns up to 4 featured + published resources for the visiting tenant,
 * ordered by sortOrder. Body is intentionally OMITTED — it would bloat the
 * homepage payload and isn't needed until the visitor opens the detail page.
 *
 * No auth required. Tenant is resolved from the request host (subdomain or
 * custom domain). If we can't resolve a tenant, return an empty list quietly
 * — the carousel just renders the empty state.
 */
import { defineEventHandler } from 'h3'
import { resolveTenantFromRequest } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const HOMEPAGE_LIMIT = 4

export default defineEventHandler(async (event) => {
  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) return { success: true, resources: [] }

  const rows = await prisma.resource.findMany({
    where: { adminId, featured: true, published: true },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: HOMEPAGE_LIMIT,
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      excerpt: true,
      coverImage: true,
      sourceName: true,
      sourceUrl: true,
      category: true,
      publishedAt: true,
    },
  })

  return { success: true, resources: rows }
})

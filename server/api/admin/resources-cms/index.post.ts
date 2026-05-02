/**
 * POST /api/admin/resources-cms
 * Creates a new homepage Resource for the current tenant.
 *
 * Required: title.
 * Optional: subtitle, excerpt, body, coverImage, sourceName, sourceUrl,
 *           externalLinks, category, featured, published, sortOrder, slug.
 *
 * If `slug` is missing or collides with another row in this tenant, we
 * derive/de-collide it server-side from the title — the UI doesn't have
 * to handle the suffix dance.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import {
  ensureUniqueSlugForTenant,
  normalizeExternalLinks,
  sanitizeHtml,
  slugify,
} from '../../../utils/resourceCms'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = (tenantFilter as any).adminId
  if (!adminId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant could not be determined for this user.' })
  }

  const body = await readBody(event).catch(() => ({})) as Record<string, any>

  const title = String(body.title || '').trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required.' })
  }

  const desiredSlug = body.slug ? slugify(String(body.slug)) : slugify(title)
  const slug = await ensureUniqueSlugForTenant(prisma, adminId, desiredSlug, null)

  // Determine the next sortOrder if the caller didn't provide one (append-to-end).
  let sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : NaN
  if (!Number.isFinite(sortOrder)) {
    const last = await prisma.resource.findFirst({
      where: { adminId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    sortOrder = (last?.sortOrder ?? -1) + 1
  }

  const published = !!body.published
  const featured = !!body.featured

  const created = await prisma.resource.create({
    data: {
      adminId,
      slug,
      title,
      subtitle: body.subtitle ? String(body.subtitle).trim().slice(0, 200) : null,
      excerpt: body.excerpt ? String(body.excerpt).trim().slice(0, 500) : null,
      body: sanitizeHtml(String(body.body || '')),
      coverImage: body.coverImage ? String(body.coverImage).trim() : null,
      sourceName: body.sourceName ? String(body.sourceName).trim().slice(0, 120) : null,
      sourceUrl: body.sourceUrl ? String(body.sourceUrl).trim() : null,
      externalLinks: normalizeExternalLinks(body.externalLinks) as any,
      category: body.category ? String(body.category).trim().slice(0, 80) : null,
      featured,
      sortOrder,
      published,
      publishedAt: published ? new Date() : null,
    },
  })

  return { success: true, resource: created }
})

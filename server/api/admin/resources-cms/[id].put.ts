/**
 * PUT /api/admin/resources-cms/:id
 * Updates a single resource for the current tenant. Tenant-scoped — admins
 * cannot edit another tenant's row even if they guess the id.
 *
 * Sends partial updates: only the fields present in the body are touched.
 * Setting `published: true` from `false` stamps `publishedAt` (and clears it
 * the other way) so admins get an accurate first-published date.
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

  const id = parseInt(event.context.params?.id || '0', 10)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid resource id.' })

  const existing = await prisma.resource.findFirst({ where: { id, adminId } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })

  const body = await readBody(event).catch(() => ({})) as Record<string, any>

  const data: Record<string, any> = {}

  if (body.title !== undefined) {
    const t = String(body.title).trim()
    if (!t) throw createError({ statusCode: 400, statusMessage: 'Title cannot be empty.' })
    data.title = t
  }

  if (body.slug !== undefined && String(body.slug).trim()) {
    const desired = slugify(String(body.slug))
    if (desired !== existing.slug) {
      data.slug = await ensureUniqueSlugForTenant(prisma, adminId, desired, id)
    }
  }

  if (body.subtitle !== undefined) {
    const v = body.subtitle == null ? null : String(body.subtitle).trim().slice(0, 200)
    data.subtitle = v || null
  }
  if (body.excerpt !== undefined) {
    const v = body.excerpt == null ? null : String(body.excerpt).trim().slice(0, 500)
    data.excerpt = v || null
  }
  if (body.body !== undefined) {
    data.body = sanitizeHtml(String(body.body || ''))
  }
  if (body.coverImage !== undefined) {
    const v = body.coverImage == null ? null : String(body.coverImage).trim()
    data.coverImage = v || null
  }
  if (body.sourceName !== undefined) {
    const v = body.sourceName == null ? null : String(body.sourceName).trim().slice(0, 120)
    data.sourceName = v || null
  }
  if (body.sourceUrl !== undefined) {
    const v = body.sourceUrl == null ? null : String(body.sourceUrl).trim()
    data.sourceUrl = v || null
  }
  if (body.externalLinks !== undefined) {
    data.externalLinks = normalizeExternalLinks(body.externalLinks) as any
  }
  if (body.category !== undefined) {
    const v = body.category == null ? null : String(body.category).trim().slice(0, 80)
    data.category = v || null
  }
  if (body.featured !== undefined) {
    data.featured = !!body.featured
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder)
    if (Number.isFinite(n)) data.sortOrder = n
  }
  if (body.published !== undefined) {
    const next = !!body.published
    data.published = next
    if (next && !existing.published) data.publishedAt = new Date()
    if (!next && existing.published) data.publishedAt = null
  }

  const updated = await prisma.resource.update({ where: { id }, data })
  return { success: true, resource: updated }
})

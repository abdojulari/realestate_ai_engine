import { defineEventHandler, readBody, getRouterParams } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const { id } = getRouterParams(event)
  const itemId = parseInt(id)

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ID' })
  }

  const existing = await prisma.flashNews.findUnique({ where: { id: itemId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Flash news not found' })
  }
  requireTenantAccess(user, existing.adminId)

  const body = await readBody(event)
  const adminId = getAdminIdForCreate(user)

  try {
    const data: any = {}

    if (body.headline !== undefined) {
      data.headline = body.headline.trim()
      if (body.slug !== undefined) {
        data.slug = body.slug
      } else if (body.headline !== existing.headline) {
        let slug = generateSlug(body.headline)
        const dup = await prisma.flashNews.findFirst({
          where: { adminId, slug, id: { not: itemId } },
        })
        if (dup) slug = `${slug}-${Date.now()}`
        data.slug = slug
      }
    }
    if (body.content !== undefined) data.content = body.content
    if (body.ctaLabel !== undefined) data.ctaLabel = body.ctaLabel?.trim() || null
    if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl?.trim() || null
    if (body.published !== undefined) data.published = body.published
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    const item = await prisma.flashNews.update({
      where: { id: itemId },
      data,
    })

    return { success: true, item }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Admin FlashNews] Error updating:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update flash news' })
  }
})

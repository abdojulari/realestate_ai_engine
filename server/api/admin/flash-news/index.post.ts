import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
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
  const adminId = getAdminIdForCreate(user)
  const body = await readBody(event)

  if (!body.headline?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Headline is required' })
  }
  if (!body.content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Content is required' })
  }

  try {
    let slug = body.slug || generateSlug(body.headline)

    const existing = await prisma.flashNews.findUnique({
      where: { adminId_slug: { adminId, slug } },
    })
    if (existing) slug = `${slug}-${Date.now()}`

    const item = await prisma.flashNews.create({
      data: {
        adminId,
        headline: body.headline.trim(),
        slug,
        content: body.content,
        ctaLabel: body.ctaLabel?.trim() || null,
        ctaUrl: body.ctaUrl?.trim() || null,
        published: body.published ?? false,
        sortOrder: body.sortOrder ?? 0,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    return { success: true, item }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Admin FlashNews] Error creating:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create flash news' })
  }
})

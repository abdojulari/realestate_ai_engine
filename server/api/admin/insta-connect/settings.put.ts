import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import {
  ensureUniqueSlug,
  isValidSlug,
  parseBranding,
  slugify,
  getSiteBaseUrl,
} from '../../../utils/instaConnect'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface SettingsBody {
  slug?: string | null
  enabled?: boolean
  branding?: {
    headline?: string | null
    company?: string | null
    primaryColor?: string | null
    coverImage?: string | null
    socialLinks?: Array<{ icon?: string | null; name: string; url: string }>
  } | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = (await readBody<SettingsBody>(event)) || {}

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, firstName: true, lastName: true, instaConnectSlug: true },
  })
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Resolve slug: explicit > existing > derived from name
  let nextSlug: string = me.instaConnectSlug || ''
  if (typeof body.slug === 'string') {
    const cleaned = slugify(body.slug)
    if (cleaned && !isValidSlug(cleaned)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug must be 3–64 chars, lowercase letters/numbers/hyphens only',
      })
    }
    nextSlug = cleaned
  }
  if (!nextSlug) {
    nextSlug = await ensureUniqueSlug(
      prisma,
      me.id,
      `${me.firstName || ''}-${me.lastName || ''}`.trim() || `agent-${me.id}`,
    )
  } else if (nextSlug !== me.instaConnectSlug) {
    nextSlug = await ensureUniqueSlug(prisma, me.id, nextSlug)
  }

  const data: {
    instaConnectSlug: string
    instaConnectEnabled?: boolean
    instaConnectBranding?: any
  } = { instaConnectSlug: nextSlug }

  if (typeof body.enabled === 'boolean') data.instaConnectEnabled = body.enabled
  if (body.branding !== undefined) {
    data.instaConnectBranding = body.branding ? parseBranding(body.branding) : null
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data,
    select: {
      instaConnectSlug: true,
      instaConnectEnabled: true,
      instaConnectBranding: true,
    },
  })

  const baseUrl = getSiteBaseUrl(event)
  return {
    slug: updated.instaConnectSlug,
    enabled: updated.instaConnectEnabled,
    branding: parseBranding(updated.instaConnectBranding),
    shareUrl: updated.instaConnectSlug
      ? baseUrl
        ? `${baseUrl}/connect/${updated.instaConnectSlug}`
        : `/connect/${updated.instaConnectSlug}`
      : null,
    publicPath: updated.instaConnectSlug ? `/connect/${updated.instaConnectSlug}` : null,
  }
})

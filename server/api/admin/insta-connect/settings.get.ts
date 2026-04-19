import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { parseBranding, getSiteBaseUrl } from '../../../utils/instaConnect'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Returns the current user's InstaConnect settings + the canonical share URL.
 * Each user has their own card (slug + branding) — not the tenant's.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      instaConnectSlug: true,
      instaConnectEnabled: true,
      instaConnectBranding: true,
    },
  })
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const baseUrl = getSiteBaseUrl(event)
  const slug = me.instaConnectSlug
  const shareUrl = slug ? (baseUrl ? `${baseUrl}/connect/${slug}` : `/connect/${slug}`) : null

  return {
    slug,
    enabled: me.instaConnectEnabled,
    branding: parseBranding(me.instaConnectBranding),
    shareUrl,
    publicPath: slug ? `/connect/${slug}` : null,
    manifestPath: slug ? `/api/insta-connect/${slug}/manifest` : null,
    vcardPath: slug ? `/api/insta-connect/${slug}/vcard` : null,
  }
})

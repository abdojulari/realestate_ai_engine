import { defineEventHandler, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { resolveStoredUploadUrl } from '../../utils/publicMediaUrl'
import { parseBranding } from '../../utils/instaConnect'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Public InstaConnect card payload — used by /connect/[slug] and the install prompt.
 */
export default defineEventHandler(async (event) => {
  const slug = (getRouterParam(event, 'slug') || '').trim().toLowerCase()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const user = await prisma.user.findFirst({
    where: { instaConnectSlug: slug, instaConnectEnabled: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatar: true,
      bio: true,
      role: true,
      adminId: true,
      instaConnectSlug: true,
      instaConnectBranding: true,
    },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'InstaConnect card not found' })
  }

  // Pull tenant branding (logo, colors, brokerage) so the card can match the agent's brand.
  const tenantAdminId = user.role === 'user' ? user.adminId : user.id
  const tenant = tenantAdminId
    ? await prisma.tenantSettings.findUnique({
        where: { adminId: tenantAdminId },
        select: {
          businessName: true,
          tagline: true,
          logoUrl: true,
          primaryColor: true,
          brokerageName: true,
          brokerageLogoUrl: true,
          socialLinks: true,
          city: true,
          province: true,
        },
      })
    : null

  const branding = parseBranding(user.instaConnectBranding)

  return {
    slug: user.instaConnectSlug,
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone,
      avatar: resolveStoredUploadUrl(user.avatar),
      bio: user.bio,
      headline: branding.headline || tenant?.tagline || 'Real Estate Agent',
      company: branding.company || tenant?.brokerageName || tenant?.businessName || '',
      location: [tenant?.city, tenant?.province].filter(Boolean).join(', '),
    },
    branding: {
      primaryColor: branding.primaryColor || tenant?.primaryColor || '#1976D2',
      coverImage: branding.coverImage || null,
      logoUrl: resolveStoredUploadUrl(tenant?.logoUrl),
      brokerageLogoUrl: resolveStoredUploadUrl(tenant?.brokerageLogoUrl),
      // Prefer per-agent socials, fall back to tenant socialLinks
      socialLinks:
        branding.socialLinks && branding.socialLinks.length > 0
          ? branding.socialLinks
          : Array.isArray(tenant?.socialLinks)
            ? (tenant!.socialLinks as Array<{ icon?: string; name: string; url: string }>)
            : [],
    },
  }
})

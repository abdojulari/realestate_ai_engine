import { defineEventHandler, getRouterParam, createError, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { parseBranding, getSiteBaseUrl } from '../../../utils/instaConnect'
import { resolveStoredUploadUrl } from '../../../utils/publicMediaUrl'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Per-agent web app manifest. Linked from /connect/[slug] so mobile browsers
 * surface "Add to Home Screen" with the agent's name and the DeelBot icon.
 *
 * Per the user's choice: per-agent display name, DeelBot icon.
 */
export default defineEventHandler(async (event) => {
  const slug = (getRouterParam(event, 'slug') || '').trim().toLowerCase()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const user = await prisma.user.findFirst({
    where: { instaConnectSlug: slug, instaConnectEnabled: true },
    select: {
      firstName: true,
      lastName: true,
      role: true,
      id: true,
      adminId: true,
      instaConnectBranding: true,
    },
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'InstaConnect card not found' })
  }

  const branding = parseBranding(user.instaConnectBranding)
  const tenantAdminId = user.role === 'user' ? user.adminId : user.id
  const tenant = tenantAdminId
    ? await prisma.tenantSettings.findUnique({
        where: { adminId: tenantAdminId },
        select: { primaryColor: true, logoUrl: true },
      })
    : null

  const baseUrl = getSiteBaseUrl(event)
  const startUrl = `/connect/${encodeURIComponent(slug)}`
  const themeColor = branding.primaryColor || tenant?.primaryColor || '#0F172A'
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'DeelBot'
  const shortName = (user.firstName || 'DeelBot').slice(0, 12)

  // Prefer the agent/tenant logo if it's a square PNG; else fall back to bundled DeelBot icons.
  const tenantLogo = resolveStoredUploadUrl(tenant?.logoUrl)
  const icons = tenantLogo
    ? [
        { src: tenantLogo, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/deelbot-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/deelbot-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/deelbot-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [
        { src: '/icons/deelbot-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/deelbot-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/deelbot-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]

  const manifest = {
    name: fullName,
    short_name: shortName,
    description: 'instaConnect — your digital business card by DeelBot',
    start_url: startUrl,
    scope: startUrl,
    id: startUrl,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: themeColor,
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity', 'social'],
    icons,
    shortcuts: [
      {
        name: 'Share my card',
        short_name: 'Share',
        url: `${startUrl}?action=share`,
        icons: [{ src: '/icons/deelbot-192.png', sizes: '192x192' }],
      },
    ],
    prefer_related_applications: false,
    ...(baseUrl ? { related_applications: [] } : {}),
  }

  setHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return manifest
})

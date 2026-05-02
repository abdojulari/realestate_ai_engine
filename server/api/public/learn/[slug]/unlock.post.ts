/**
 * POST /api/public/learn/:slug/unlock
 *
 * Captures a lead (name + email + optional phone) for a homepage Resource,
 * persists a ResourceLead row, and returns the full body + an unlock cookie
 * good for 30 days. The cookie is HttpOnly so JS can't read it; the body in
 * the response lets the page render without a second round-trip.
 *
 * Mirrors the proven /api/public/resources/[slug]/unlock.post.ts pattern but
 * uses a different cookie namespace (`lr_*` vs `mr_*`) so the two systems
 * never share a token.
 */
import {
  defineEventHandler,
  readBody,
  createError,
  setCookie,
  getRequestIP,
  getRequestHeader,
} from 'h3'
import { resolveTenantFromRequest } from '../../../../utils/tenant'
import {
  cookieNameForLearnSlug,
  signLearnAccessToken,
} from '../../../../utils/resourceCms'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })

  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })

  const resource = await prisma.resource.findFirst({
    where: { adminId, slug, published: true },
  })
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })
  }

  const body = await readBody(event).catch(() => ({})) as Record<string, any>

  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const phone = body?.phone ? String(body.phone).trim() : null
  const consent = body?.consent === true || body?.consent === 'true'

  if (!name || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter your full name.' })
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email address is required.' })
  }
  if (!consent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please accept the consent box to continue.',
    })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  const userAgent = getRequestHeader(event, 'user-agent') || null
  const referrer = getRequestHeader(event, 'referer') || null

  await prisma.resourceLead.create({
    data: {
      resourceId: resource.id,
      adminId: resource.adminId,
      name,
      email,
      phone,
      ipAddress: ip,
      userAgent,
      referrer,
    },
  })

  // Best-effort unlock counter — never block the response.
  prisma.resource
    .update({ where: { id: resource.id }, data: { unlockCount: { increment: 1 } } })
    .catch(() => {})

  const token = signLearnAccessToken(slug, resource.id)

  // Secure cookies are not sent over plain HTTP. We only set Secure when the
  // request actually arrived via HTTPS (either direct TLS or behind a
  // proxy that set X-Forwarded-Proto). Otherwise the browser silently drops
  // the cookie and the page never unlocks.
  const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const tlsDirect = Boolean((event.node.req as { socket?: { encrypted?: boolean } }).socket?.encrypted)
  const isHttps = forwardedProto === 'https' || (forwardedProto !== 'http' && tlsDirect)
  const secure = process.env.NODE_ENV === 'production' && isHttps

  setCookie(event, cookieNameForLearnSlug(slug), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  // Return the full body in the response so the page can show the article
  // immediately without a second fetch (and survive the cookie not being
  // visible to client-side JS).
  return {
    success: true,
    body: resource.body,
  }
})

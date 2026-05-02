/**
 * GET /api/public/learn/:slug
 *
 * Detail-page payload for a single resource. The body is gated:
 *   - If the visitor presents a valid unlock cookie (`lr_<slug>`), we
 *     return the full body and stamp viewCount.
 *   - Otherwise we return a SHORT preview only (first ~600 chars of the
 *     stripped-text body) so the page can show a partial preview and
 *     prompt for the lead-capture form. The full body never reaches the
 *     browser without an unlock — protecting against right-click "view
 *     source" bypass.
 *
 * Tenant is resolved from the request host so two tenants can have the
 * same slug ("first-time-buyer-guide") without colliding.
 */
import { defineEventHandler, createError, getCookie, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { resolveTenantFromRequest } from '../../../../utils/tenant'
import {
  cookieNameForLearnSlug,
  verifyLearnAccessToken,
} from '../../../../utils/resourceCms'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/** Strip HTML tags + collapse whitespace; cap at `max` chars for the teaser. */
function plainTextPreview(html: string, max = 600): string {
  if (!html) return ''
  const text = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })

  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })

  const resource = await prisma.resource.findFirst({
    where: { adminId, slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      excerpt: true,
      body: true,
      coverImage: true,
      sourceName: true,
      sourceUrl: true,
      externalLinks: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
    },
  })
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })
  }

  const cookie = getCookie(event, cookieNameForLearnSlug(slug))
  let unlocked = verifyLearnAccessToken(cookie ?? null, slug, resource.id)

  // Logged-in visitors should never hit the lead-gen wall — they're already
  // a known user. We optionally accept the same Bearer token format the rest
  // of the app uses and unlock if it verifies. This endpoint is still public
  // (no token = no error, just locked response). We do NOT create a lead row
  // for an authenticated read, so the analytics in admin stay clean.
  if (!unlocked) {
    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim()
      if (token) {
        try {
          const secret = process.env.JWT_SECRET || 'fallback-secret'
          jwt.verify(token, secret)
          unlocked = true
        } catch {
          // Invalid / expired tokens are silently ignored — the page just
          // stays locked, same as if the visitor weren't signed in.
        }
      }
    }
  }

  // Best-effort view counter. Failing here must not block the response —
  // worst case a single view goes uncounted.
  prisma.resource
    .update({ where: { id: resource.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  if (unlocked) {
    return {
      success: true,
      unlocked: true,
      resource: {
        ...resource,
        body: resource.body, // full HTML
        bodyPreview: null,
      },
    }
  }

  // Visitor has not unlocked — strip the full body from the wire response.
  return {
    success: true,
    unlocked: false,
    resource: {
      ...resource,
      body: '', // never expose pre-unlock
      bodyPreview: plainTextPreview(resource.body),
    },
  }
})

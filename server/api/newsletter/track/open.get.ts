import { verifyNewsletterToken } from '../../../utils/newsletterTokens'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Open-tracking pixel endpoint.
 *
 * Always returns a 1×1 transparent GIF, even on bad/expired tokens, so mail
 * clients never render a "broken image" placeholder for recipients.
 *
 * Side effects (only on valid token):
 *   • SentNewsletter.openedAt set to now() if not already set (first-open only)
 *   • Newsletter.openCount incremented on first open per recipient
 *
 * Tenancy: scoped to (newsletterId, subscriberId) belonging to `aid` — won't
 * cross-write counters between tenants even if a token were leaked across.
 */

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawToken = typeof query.token === 'string' ? query.token : ''
  const payload = verifyNewsletterToken(rawToken, 'o')

  if (payload) {
    try {
      const existing = await prisma.sentNewsletter.findFirst({
        where: {
          newsletterId: payload.nid,
          subscriberId: payload.sid,
          newsletter: { adminId: payload.aid },
        },
        select: { id: true, openedAt: true },
      })

      if (existing && existing.openedAt == null) {
        await prisma.$transaction([
          prisma.sentNewsletter.update({
            where: { id: existing.id },
            data: { openedAt: new Date() },
          }),
          prisma.newsletter.update({
            where: { id: payload.nid },
            data: { openCount: { increment: 1 } },
          }),
        ])
      }
    } catch (e) {
      console.error('[newsletter:track:open] failed to record open:', e)
    }
  }

  setResponseHeader(event, 'Content-Type', 'image/gif')
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, private')
  setResponseHeader(event, 'Pragma', 'no-cache')
  return PIXEL
})

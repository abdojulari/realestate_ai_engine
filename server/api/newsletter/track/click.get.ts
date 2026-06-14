import { verifyNewsletterToken } from '../../../utils/newsletterTokens'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Click-tracking redirect.
 *
 * Every absolute http(s) link in a sent newsletter is rewritten to come
 * through this endpoint (`?token=...&u=<base64url(originalUrl)>`). We verify
 * the HMAC, record the click, then 302 to the original URL. Bad tokens or
 * unsafe URL schemes redirect to the tenant's site root rather than the
 * untrusted `u` param.
 *
 * Tenancy: scoped to (newsletterId, subscriberId) belonging to `aid`.
 */

const SAFE_SCHEMES = /^https?:\/\//i

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4)
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  return Buffer.from(b64, 'base64').toString('utf8')
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawToken = typeof query.token === 'string' ? query.token : ''
  const rawU = typeof query.u === 'string' ? query.u : ''

  let target = '/'
  if (rawU) {
    try {
      const decoded = base64UrlDecode(rawU)
      if (SAFE_SCHEMES.test(decoded)) target = decoded
    } catch {
      /* fall through to '/' */
    }
  }

  const payload = verifyNewsletterToken(rawToken, 'c')
  if (payload) {
    try {
      const existing = await prisma.sentNewsletter.findFirst({
        where: {
          newsletterId: payload.nid,
          subscriberId: payload.sid,
          newsletter: { adminId: payload.aid },
        },
        select: { id: true, clickedAt: true },
      })

      if (existing && existing.clickedAt == null) {
        await prisma.$transaction([
          prisma.sentNewsletter.update({
            where: { id: existing.id },
            data: { clickedAt: new Date() },
          }),
          prisma.newsletter.update({
            where: { id: payload.nid },
            data: { clickCount: { increment: 1 } },
          }),
        ])
      }
    } catch (e) {
      console.error('[newsletter:track:click] failed to record click:', e)
    }
  }

  await sendRedirect(event, target, 302)
})

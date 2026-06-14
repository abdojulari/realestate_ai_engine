import { verifyNewsletterToken } from '../../utils/newsletterTokens'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * One-click unsubscribe endpoint.
 *
 * Recipients can land here straight from the email "Unsubscribe" link
 * without JavaScript and without re-entering their address — the token
 * carries `subscriberId` + `adminId` (HMAC-signed, not encrypted).
 *
 * Tenancy: the token's `aid` is the broker the subscriber belongs to.
 * Without that match we 404 (rather than letting one tenant's link
 * unsubscribe a same-email subscriber under a different tenant).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawToken = typeof query.token === 'string' ? query.token : ''

  const payload = verifyNewsletterToken(rawToken, 'u')
  if (!payload) {
    return { success: false, message: 'This unsubscribe link is invalid or has expired.' }
  }

  try {
    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { id: payload.sid, adminId: payload.aid },
    })

    if (!subscriber) {
      return { success: false, message: 'Subscription not found.' }
    }

    if (subscriber.status === 'unsubscribed') {
      return { success: true, alreadyUnsubscribed: true, email: subscriber.email }
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'unsubscribed', unsubscribedAt: new Date() },
    })

    return { success: true, email: subscriber.email }
  } catch (error) {
    console.error('Newsletter unsubscribe (GET) error:', error)
    return { success: false, message: 'An error occurred. Please try again later.' }
  }
})

/**
 * Shared audience-filter logic for newsletter sends and audience-count UI.
 *
 * Single source of truth so the campaign builder's "X subscribers will receive
 * this" count, the create-time `recipientCount`, and the actual send query all
 * stay in agreement. Without this, the builder showed one number and the send
 * actually targeted a different set.
 *
 * Compliance: we NEVER mail unsubscribed/bounced contacts — every audience
 * value is a narrowing within `status = 'active'`.
 */

export type NewsletterAudience = 'all' | 'new' | 'inactive'

export const KNOWN_AUDIENCES: readonly NewsletterAudience[] = ['all', 'new', 'inactive']

export function normalizeAudience(input: unknown): NewsletterAudience {
  if (typeof input === 'string' && (KNOWN_AUDIENCES as readonly string[]).includes(input)) {
    return input as NewsletterAudience
  }
  return 'all'
}

/**
 * Build a Prisma `where` for `NewsletterSubscriber` that resolves the given
 * audience inside the provided tenant filter. Always includes `status='active'`.
 *
 *  • 'all'      → all active subscribers in this tenant
 *  • 'new'      → active subscribers with `subscribedAt >= now - 30 days`
 *                 (catches both first signups and reactivations, since the
 *                 subscribe handler refreshes `subscribedAt` on reactivation)
 *  • 'inactive' → active subscribers with no opened/clicked SentNewsletter
 *                 in the last 90 days (typical re-engagement segment, also
 *                 includes never-mailed)
 */
export function buildAudienceWhere(
  audience: NewsletterAudience,
  tenantFilter: { adminId?: number }
): Record<string, unknown> {
  const where: Record<string, unknown> = { status: 'active', ...tenantFilter }

  if (audience === 'new') {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    where.subscribedAt = { gte: thirtyDaysAgo }
  } else if (audience === 'inactive') {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    where.NOT = {
      sentNewsletters: {
        some: {
          OR: [
            { openedAt: { gte: ninetyDaysAgo } },
            { clickedAt: { gte: ninetyDaysAgo } },
          ],
        },
      },
    }
  }

  return where
}

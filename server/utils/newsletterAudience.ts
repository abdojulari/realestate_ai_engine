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

export type NewsletterAudience = 'all' | 'new' | 'inactive' | 'specific'

export const KNOWN_AUDIENCES: readonly NewsletterAudience[] = ['all', 'new', 'inactive', 'specific']

export function normalizeAudience(input: unknown): NewsletterAudience {
  if (typeof input === 'string' && (KNOWN_AUDIENCES as readonly string[]).includes(input)) {
    return input as NewsletterAudience
  }
  return 'all'
}

/**
 * Coerce an arbitrary input (usually pulled from a JSON column) to a clean
 * list of positive integer subscriber IDs, deduplicated. Anything else is
 * dropped silently — we'd rather under-mail than blast a malformed value.
 */
export function normalizeSubscriberIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  const ids = new Set<number>()
  for (const raw of input) {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isInteger(n) && n > 0) ids.add(n)
  }
  return Array.from(ids)
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
 *  • 'specific' → only subscribers in `subscriberIds` (still must be active
 *                 and inside the tenant filter — can never leak across tenants
 *                 by passing IDs from another admin)
 *
 * SECURITY GUARANTEE: this helper REFUSES to build a where clause without
 * a concrete tenant `adminId`. Without it, the resulting query would match
 * every subscriber on the platform, so we substitute an impossible `adminId`
 * sentinel rather than throw — that way upstream `count`/`findMany` calls
 * just return 0 / empty instead of crashing the request, but never leak
 * across tenants. Callers should still check for a missing tenant before
 * even calling in.
 */
export function buildAudienceWhere(
  audience: NewsletterAudience,
  tenantFilter: { adminId?: number },
  subscriberIds?: number[]
): Record<string, unknown> {
  // Hard tenant gate — if no admin scope is provided the query intentionally
  // matches nothing. Better an empty audience than a cross-tenant blast.
  const tenantScoped: { adminId: number } =
    tenantFilter.adminId != null
      ? { adminId: tenantFilter.adminId }
      : { adminId: -1 }

  const where: Record<string, unknown> = { status: 'active', ...tenantScoped }

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
  } else if (audience === 'specific') {
    const ids = normalizeSubscriberIds(subscriberIds)
    // Force an empty result if no valid IDs were supplied so callers can't
    // accidentally fall through to "all subscribers".
    where.id = ids.length > 0 ? { in: ids } : { in: [-1] }
  }

  return where
}

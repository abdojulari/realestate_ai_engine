import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { buildAudienceWhere, normalizeAudience, normalizeSubscriberIds } from '../../../utils/newsletterAudience'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Live audience size for the campaign builder.
 *
 * Uses the same `buildAudienceWhere` helper as the send path, so the count
 * the admin sees in "This campaign will be sent to X subscribers" is exactly
 * the number that will actually receive the email — no drift between
 * builder and sender.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  // Without a tenant scope this would count every subscriber on the platform.
  // `requireAdmin` should never let an unscoped user through, but be explicit.
  if (tenantFilter.adminId == null) {
    throw createError({ statusCode: 403, message: 'No tenant context' })
  }

  const query = getQuery(event)
  const audience = normalizeAudience(query.audience)

  // For 'specific' audiences the caller passes `subscriberIds` either as a
  // repeated query param or a comma-separated string. Both shapes show up
  // depending on how Nuxt serializes the params, so handle either.
  const rawIds = query.subscriberIds
  const idList = Array.isArray(rawIds)
    ? rawIds
    : typeof rawIds === 'string'
    ? rawIds.split(',')
    : []
  const requestedIds = normalizeSubscriberIds(idList)

  const where = buildAudienceWhere(audience, tenantFilter, requestedIds)
  const count = await prisma.newsletterSubscriber.count({ where })

  // Don't echo the raw `requestedIds` back — that could include IDs from
  // other tenants and the caller might mistake the echo for "valid".
  // Instead report how many of the requested IDs are actually owned.
  let resolvedCount = 0
  if (audience === 'specific' && requestedIds.length > 0) {
    resolvedCount = await prisma.newsletterSubscriber.count({
      where: { id: { in: requestedIds }, adminId: tenantFilter.adminId },
    })
  }

  return { audience, count, requested: requestedIds.length, resolved: resolvedCount }
})

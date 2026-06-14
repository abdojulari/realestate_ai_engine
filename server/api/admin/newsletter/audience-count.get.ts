import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { buildAudienceWhere, normalizeAudience } from '../../../utils/newsletterAudience'
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

  const query = getQuery(event)
  const audience = normalizeAudience(query.audience)

  const where = buildAudienceWhere(audience, tenantFilter)
  const count = await prisma.newsletterSubscriber.count({ where })

  return { audience, count }
})

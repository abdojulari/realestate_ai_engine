import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getPublicSharedMlsWhere } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * GET /api/admin/properties/:id
 *
 * Access policy: shared-MLS reads + tenant-scoped manual reads.
 *
 * Why this is intentionally permissive
 * ────────────────────────────────────
 * CREA + Pillar9 inventory is shared platform-wide (see SHARED_MLS_SOURCES
 * in server/utils/tenant.ts). Other admin endpoints that list MLS rows —
 * notably /api/admin/price-cuts (Best Deals) and the public catalogue —
 * already use `getPublicSharedMlsWhere` so every tenant can see the same
 * MLS feed. The detail endpoint had been enforcing strict adminId scoping,
 * which 404'd every tenant whose adminId didn't happen to match the row
 * stamped by the sync user. Net effect: "Details" worked only for the
 * tenant that ran the sync (e.g. AOhomes) and broke for everyone else.
 *
 * Mutations (PUT / DELETE / duplicate / featured) are unchanged — they
 * keep using `getTenantFilter` + `requireTenantAccess`, so only the
 * owning tenant can edit or delete a row. Shared MLS rows are effectively
 * read-only to non-owning tenants, which matches the data's nature
 * (sourced from MLS feeds; tenants don't own the content).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const sharedWhere = getPublicSharedMlsWhere(tenantFilter)

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  // Match the same OR clause used by the list/deals endpoints:
  //   - any shared-MLS row (source: 'crea' | 'pillar9'), OR
  //   - a manual row owned by THIS tenant.
  // Manual rows from other tenants stay hidden.
  const property = await prisma.property.findFirst({
    where: { id, ...sharedWhere },
  })
  if (!property) throw createError({ statusCode: 404, message: 'Property not found' })

  return { property }
})

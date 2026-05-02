/**
 * POST /api/admin/resources-cms/reorder
 * Bulk-update sortOrder after a drag-and-drop reorder in the admin UI.
 *
 * Body: { ids: number[] }   // ids in their NEW display order
 *
 * We update in a transaction so the row indexes can never end up partially
 * applied (e.g. half the resources renumbered, half stale, leading to
 * duplicate sortOrders on the carousel).
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = (tenantFilter as any).adminId
  if (!adminId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant could not be determined for this user.' })
  }

  const body = await readBody(event).catch(() => ({})) as { ids?: unknown }
  if (!Array.isArray(body.ids)) {
    throw createError({ statusCode: 400, statusMessage: '`ids` must be an array of resource ids.' })
  }

  const ids: number[] = body.ids
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0)

  if (ids.length === 0) return { success: true, updated: 0 }

  // Defensive: only renumber rows that ACTUALLY belong to this tenant.
  // Otherwise a malicious caller could mass-renumber another tenant's data.
  const owned = await prisma.resource.findMany({
    where: { id: { in: ids }, adminId },
    select: { id: true },
  })
  const ownedSet = new Set(owned.map((r) => r.id))
  const safeIds = ids.filter((id) => ownedSet.has(id))

  await prisma.$transaction(
    safeIds.map((id, index) =>
      prisma.resource.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )

  return { success: true, updated: safeIds.length }
})

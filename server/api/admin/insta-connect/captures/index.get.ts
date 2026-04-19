import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * List InstaConnect captures for the current tenant.
 * Query: status=pending|accepted|rejected|all (default: all), limit (default 100), offset.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getTenantAdminId(user)
  if (!adminId) return { captures: [], total: 0, counts: { pending: 0, accepted: 0, rejected: 0 } }

  const q = getQuery(event)
  const status = String(q.status || 'all').toLowerCase()
  const limit = Math.min(Math.max(parseInt(String(q.limit || '100'), 10) || 100, 1), 500)
  const offset = Math.max(parseInt(String(q.offset || '0'), 10) || 0, 0)

  const where: { adminId: number; status?: string } = { adminId }
  if (status === 'pending' || status === 'accepted' || status === 'rejected') {
    where.status = status
  }

  const [captures, total, pending, accepted, rejected] = await Promise.all([
    prisma.instaConnectCapture.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.instaConnectCapture.count({ where }),
    prisma.instaConnectCapture.count({ where: { adminId, status: 'pending' } }),
    prisma.instaConnectCapture.count({ where: { adminId, status: 'accepted' } }),
    prisma.instaConnectCapture.count({ where: { adminId, status: 'rejected' } }),
  ])

  return {
    captures,
    total,
    counts: { pending, accepted, rejected },
  }
})

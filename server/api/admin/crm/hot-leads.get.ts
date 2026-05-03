/**
 * GET /api/admin/crm/hot-leads
 *
 * Top N CrmClients for the tenant ordered by leadScore DESC, then by
 * lastTouchAt DESC. Powers the "Hot Leads" panel on the CRM dashboard.
 *
 * Query params:
 *   limit?:    number   default 10, capped at 50
 *   minScore?: number   default 1   (0 hides everyone who hasn't done anything)
 *
 * Includes a tiny event-history slice (last 5 events per client) so the
 * panel can render an inline activity tooltip without a second round-trip.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const MAX_LIMIT = 50

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)
    const limit = Math.min(Math.max(parseInt(String(query.limit ?? 10), 10) || 10, 1), MAX_LIMIT)
    const minScore = Math.max(parseInt(String(query.minScore ?? 1), 10) || 1, 0)

    const clients = await prisma.crmClient.findMany({
      where: { ...tenantFilter, leadScore: { gte: minScore } },
      orderBy: [
        { leadScore: 'desc' },
        { lastTouchAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        source: true,
        leadScore: true,
        intent: true,
        lifecycleStage: true,
        lastTouchAt: true,
        firstTouchAt: true,
        createdAt: true,
      },
    })

    if (clients.length === 0) {
      return { clients: [] }
    }

    const emails = clients.map((c) => c.email).filter((e): e is string => !!e)
    const recent = await prisma.eventLog.findMany({
      where: {
        ...tenantFilter,
        email: { in: emails },
      },
      orderBy: { createdAt: 'desc' },
      take: 5 * clients.length,
      select: { email: true, name: true, createdAt: true, objectType: true, objectId: true },
    })

    const byEmail = new Map<string, typeof recent>()
    for (const ev of recent) {
      if (!ev.email) continue
      const arr = byEmail.get(ev.email) || []
      if (arr.length < 5) {
        arr.push(ev)
        byEmail.set(ev.email, arr)
      }
    }

    return {
      clients: clients.map((c) => ({
        ...c,
        recentEvents: c.email ? byEmail.get(c.email) || [] : [],
      })),
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Internal server error' })
  }
})

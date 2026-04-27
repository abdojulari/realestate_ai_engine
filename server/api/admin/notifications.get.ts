import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { mergeTenantUserListWhere } from '../../utils/delegateUserManagement'
import { getTenantFilter } from '../../utils/tenant'
import { isAnniversaryToday } from '../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const userWhere = mergeTenantUserListWhere(user as any, {})

  const [latestUsers, latestProps, latestCaptures, settings, celebrationClients] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
    }),
    prisma.property.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, address: true, createdAt: true }
    }),
    // InstaConnect captures (already tenant-scoped via adminId on the model).
    prisma.instaConnectCapture.findMany({
      where: tenantFilter.adminId ? { adminId: tenantFilter.adminId } : {},
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        interest: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.setting.findMany({
      where: {
        ...tenantFilter,
        key: { in: ['notifications.enabled', 'notifications.lastSeenAt', 'notifications.dismissedIds'] }
      }
    }),
    // Pull tenant clients with any anniversary date set; we filter to "today" in JS.
    // The list per tenant is small, and Postgres date-without-year matching is awkward.
    prisma.crmClient.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { dateOfBirth: { not: null } },
          { weddingAnniversary: { not: null } },
          { closingAnniversary: { not: null } },
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        dateOfBirth: true, weddingAnniversary: true, closingAnniversary: true,
      },
    }),
  ])

  const enabledSetting = settings.find(s => s.key === 'notifications.enabled')
  const lastSeenSetting = settings.find(s => s.key === 'notifications.lastSeenAt')
  const dismissedSetting = settings.find(s => s.key === 'notifications.dismissedIds')
  const enabled = enabledSetting ? enabledSetting.value === 'true' : true
  const lastSeenAt = lastSeenSetting ? new Date(lastSeenSetting.value) : new Date(0)
  const dismissedIds: string[] = (() => { try { return JSON.parse(dismissedSetting?.value || '[]') } catch { return [] } })()

  const userNotifs = latestUsers.map(u => ({
    id: `user-${u.id}`,
    type: 'user',
    title: 'New User Registration',
    message: `${u.firstName} ${u.lastName} (${u.email}) registered`,
    createdAt: u.createdAt,
    read: u.createdAt <= lastSeenAt
  }))

  const propNotifs = latestProps.map(p => ({
    id: `property-${p.id}`,
    type: 'property',
    title: 'New Property Listed',
    message: `${p.title} • ${p.address}`,
    createdAt: p.createdAt,
    read: p.createdAt <= lastSeenAt
  }))

  const captureNotifs = latestCaptures.map(c => ({
    id: `instaconnect-${c.id}`,
    type: 'instaconnect',
    title: c.status === 'pending' ? 'New InstaConnect contact' : 'InstaConnect contact',
    message: `${c.firstName} ${c.lastName}${c.company ? ' • ' + c.company : ''}${c.interest ? ' • ' + c.interest : ''}`,
    href: '/admin/lead-generation?tab=instaconnect',
    createdAt: c.createdAt,
    read: c.createdAt <= lastSeenAt,
  }))

  // Celebration notifications: synthesize one per (client, kind) for today's anniversaries.
  // Created-at is set to the start of "today" so they sort to the top of the feed.
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const celebrationNotifs = celebrationClients.flatMap((c) => {
    const items: Array<{ id: string; type: string; title: string; message: string; href: string; createdAt: Date; read: boolean }> = []
    const push = (kind: 'birthday' | 'anniversary' | 'closing', date: Date | null, title: string, descriptor: string) => {
      if (!isAnniversaryToday(date, today)) return
      items.push({
        id: `celebration-${kind}-${c.id}-${today.toISOString().slice(0, 10)}`,
        type: 'celebration',
        title,
        message: `${c.firstName} ${c.lastName}${c.email ? ' · ' + c.email : ''} — ${descriptor}`,
        href: '/admin/crm',
        createdAt: today,
        read: today <= lastSeenAt,
      })
    }
    push('birthday',    c.dateOfBirth,         '🎂 Birthday today',           'send birthday wishes')
    push('anniversary', c.weddingAnniversary,  '💍 Wedding anniversary today','send anniversary wishes')
    push('closing',     c.closingAnniversary,  '🔑 Closing anniversary today','send a thank-you note')
    return items
  })

  const notifications = [...celebrationNotifs, ...userNotifs, ...propNotifs, ...captureNotifs]
    .filter(n => !dismissedIds.includes(n.id))
    .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    .slice(0, 50)

  const unread = notifications.filter(n => !n.read).length
  return {
    enabled,
    lastSeenAt,
    notifications,
    counts: {
      users: latestUsers.length,
      properties: latestProps.length,
      instaconnect: latestCaptures.length,
      celebrations: celebrationNotifs.length,
      unread,
    },
  }
})

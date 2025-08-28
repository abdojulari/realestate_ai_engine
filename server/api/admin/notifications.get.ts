import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const [latestUsers, latestProps, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } }),
    prisma.property.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, title: true, address: true, createdAt: true } }),
    prisma.setting.findMany({ where: { key: { in: ['notifications.enabled', 'notifications.lastSeenAt', 'notifications.dismissedIds'] } } })
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

  const notifications = [...userNotifs, ...propNotifs]
    .filter(n => !dismissedIds.includes(n.id))
    .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    .slice(0, 50)

  const unread = notifications.filter(n => !n.read).length
  return { enabled, lastSeenAt, notifications, counts: { users: latestUsers.length, properties: latestProps.length, unread } }
})



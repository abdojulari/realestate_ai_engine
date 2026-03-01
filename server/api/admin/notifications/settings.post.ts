import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  // Use the tenant admin ID for scoping notification settings.
  // Each admin (tenant) has their own notification settings.
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const enabled = typeof body.enabled === 'boolean' ? String(body.enabled) : undefined
  const lastSeenAt = body.lastSeenAt ? new Date(body.lastSeenAt).toISOString() : undefined
  const dismissedIds = Array.isArray(body.dismissedIds) ? JSON.stringify(body.dismissedIds) : undefined

  async function upsert(key: string, value?: string) {
    if (typeof value === 'undefined') return
    await prisma.setting.upsert({
      where: { adminId_key: { adminId, key } },
      create: { adminId, key, value },
      update: { value }
    })
  }

  await Promise.all([
    upsert('notifications.enabled', enabled),
    upsert('notifications.lastSeenAt', lastSeenAt),
    upsert('notifications.dismissedIds', dismissedIds)
  ])

  return { success: true }
})

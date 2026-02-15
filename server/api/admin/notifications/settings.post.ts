import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const prisma = new PrismaClient()

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

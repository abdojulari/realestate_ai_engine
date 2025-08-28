import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = (event as any).context?.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (user.role !== 'admin' && user.role !== 'agent') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readBody(event)
  const enabled = typeof body.enabled === 'boolean' ? String(body.enabled) : undefined
  const lastSeenAt = body.lastSeenAt ? new Date(body.lastSeenAt).toISOString() : undefined
  const dismissedIds = Array.isArray(body.dismissedIds) ? JSON.stringify(body.dismissedIds) : undefined

  async function upsert(key: string, value?: string) {
    if (typeof value === 'undefined') return
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
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



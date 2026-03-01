import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const { autoSyncEnabled, autoSyncTime } = await readBody(event)

  try {
    // Helper to upsert scoped to tenant
    async function upsertSetting(key: string, value: string) {
      const existing = await prisma.setting.findFirst({
        where: { key, adminId }
      })
      if (existing) {
        await prisma.setting.update({
          where: { id: existing.id },
          data: { value }
        })
      } else {
        await prisma.setting.create({
          data: { key, value, adminId }
        })
      }
    }

    // Store auto-sync settings in the settings table
    await upsertSetting('crea_auto_sync_enabled', String(autoSyncEnabled))
    await upsertSetting('crea_auto_sync_time', autoSyncTime)

    console.log('✅ Auto-sync settings updated:', { autoSyncEnabled, autoSyncTime })

    return {
      success: true,
      settings: { autoSyncEnabled, autoSyncTime }
    }
  } catch (error: any) {
    console.error('❌ Failed to update auto-sync settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update settings'
    })
  }
})

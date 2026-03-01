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
  // Verify admin access
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const {
    autoSyncEnabled,
    autoSyncTime,
    syncSold,
    syncPending,
    deduplicateCrea,
    defaultProvince
  } = body

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

    // Update settings
    const settingsToUpdate = [
      { key: 'pillar9_auto_sync_enabled', value: String(autoSyncEnabled ?? false) },
      { key: 'pillar9_auto_sync_time', value: autoSyncTime || '01:00' },
      { key: 'pillar9_sync_sold', value: String(syncSold ?? false) },
      { key: 'pillar9_sync_pending', value: String(syncPending ?? false) },
      { key: 'pillar9_deduplicate_crea', value: String(deduplicateCrea ?? true) },
      { key: 'pillar9_default_province', value: defaultProvince || 'AB' }
    ]

    for (const setting of settingsToUpdate) {
      await upsertSetting(setting.key, setting.value)
    }

    console.log('✅ Pillar9 settings updated:', settingsToUpdate)

    return {
      success: true,
      message: 'Pillar9 sync settings updated successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to update Pillar9 settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update settings: ${error.message}`
    })
  }
})

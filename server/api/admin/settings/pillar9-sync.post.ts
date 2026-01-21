import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Verify admin access
  await requireAdmin(event)

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
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      })
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

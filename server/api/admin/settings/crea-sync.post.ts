import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { autoSyncEnabled, autoSyncTime } = await readBody(event)

  try {
    // Store auto-sync settings in the settings table
    await prisma.setting.upsert({
      where: { key: 'crea_auto_sync_enabled' },
      update: { value: String(autoSyncEnabled) },
      create: { key: 'crea_auto_sync_enabled', value: String(autoSyncEnabled) }
    })

    await prisma.setting.upsert({
      where: { key: 'crea_auto_sync_time' },
      update: { value: autoSyncTime },
      create: { key: 'crea_auto_sync_time', value: autoSyncTime }
    })

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

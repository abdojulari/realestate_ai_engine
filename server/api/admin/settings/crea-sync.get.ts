import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Get auto-sync settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['crea_auto_sync_enabled', 'crea_auto_sync_time']
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return {
      autoSyncEnabled: settingsMap.crea_auto_sync_enabled === 'true',
      autoSyncTime: settingsMap.crea_auto_sync_time || '00:00'
    }
  } catch (error: any) {
    console.error('❌ Failed to load auto-sync settings:', error)
    return {
      autoSyncEnabled: false,
      autoSyncTime: '00:00'
    }
  }
})

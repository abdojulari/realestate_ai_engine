import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    // Get Pillar9 auto-sync settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'pillar9_auto_sync_enabled',
            'pillar9_auto_sync_time',
            'pillar9_sync_sold',
            'pillar9_sync_pending',
            'pillar9_deduplicate_crea',
            'pillar9_default_province',
            'pillar9_last_sync'
          ]
        },
        ...tenantFilter
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return {
      autoSyncEnabled: settingsMap.pillar9_auto_sync_enabled === 'true',
      autoSyncTime: settingsMap.pillar9_auto_sync_time || '01:00',
      syncSold: settingsMap.pillar9_sync_sold === 'true',
      syncPending: settingsMap.pillar9_sync_pending === 'true',
      deduplicateCrea: settingsMap.pillar9_deduplicate_crea !== 'false', // Default true
      defaultProvince: settingsMap.pillar9_default_province || 'AB',
      lastSync: settingsMap.pillar9_last_sync || null
    }
  } catch (error: any) {
    console.error('❌ Failed to load Pillar9 settings:', error)
    return {
      autoSyncEnabled: false,
      autoSyncTime: '01:00',
      syncSold: false,
      syncPending: false,
      deduplicateCrea: true,
      defaultProvince: 'AB',
      lastSync: null
    }
  }
})

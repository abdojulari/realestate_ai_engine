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
    // Get auto-sync settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['crea_auto_sync_enabled', 'crea_auto_sync_time']
        },
        ...tenantFilter
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

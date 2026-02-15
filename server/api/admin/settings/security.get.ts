import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    // Get all security settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'security.'
        },
        ...tenantFilter
      }
    })

    // Convert to object format
    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.replace('security.', '')
      // Convert boolean strings back to booleans
      if (setting.value === 'true' || setting.value === 'false') {
        acc[key] = setting.value === 'true'
      } else {
        acc[key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    return {
      sessionTimeout: settingsMap.sessionTimeout || '30',
      passwordPolicy: settingsMap.passwordPolicy || 'medium',
      twoFactorAuth: settingsMap.twoFactorAuth || false,
      ipWhitelisting: settingsMap.ipWhitelisting || false,
      whitelistedIps: settingsMap.whitelistedIps || ''
    }
  } catch (error: any) {
    console.error('❌ Failed to load security settings:', error)
    return {
      sessionTimeout: '30',
      passwordPolicy: 'medium',
      twoFactorAuth: false,
      ipWhitelisting: false,
      whitelistedIps: ''
    }
  }
})

import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Get all security settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'security.'
        }
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

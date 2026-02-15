import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    // Get all general settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'general.'
        },
        ...tenantFilter
      }
    })

    // Convert to object format
    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.replace('general.', '')
      acc[key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return {
      siteName: settingsMap.siteName || '',
      supportEmail: settingsMap.supportEmail || '',
      phone: settingsMap.phone || '',
      timezone: settingsMap.timezone || 'America/New_York',
      logo: settingsMap.logo || null
    }
  } catch (error: any) {
    console.error('❌ Failed to load general settings:', error)
    return {
      siteName: '',
      supportEmail: '',
      phone: '',
      timezone: 'America/New_York',
      logo: null
    }
  }
})

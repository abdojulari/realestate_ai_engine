import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    // Get all email settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'email.'
        },
        ...tenantFilter
      }
    })

    // Convert to object format
    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.replace('email.', '')
      try {
        // Try to parse JSON for complex objects like SMTP
        acc[key] = key === 'smtp' ? JSON.parse(setting.value) : setting.value
      } catch {
        acc[key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    return {
      provider: settingsMap.provider || '',
      fromEmail: settingsMap.fromEmail || '',
      fromName: settingsMap.fromName || '',
      smtp: settingsMap.smtp || {
        host: '',
        port: '',
        username: '',
        password: '',
        secure: true
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to load email settings:', error)
    return {
      provider: '',
      fromEmail: '',
      fromName: '',
      smtp: {
        host: '',
        port: '',
        username: '',
        password: '',
        secure: true
      }
    }
  }
})

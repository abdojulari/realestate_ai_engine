import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Get all email settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'email.'
        }
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

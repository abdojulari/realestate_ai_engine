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

    // Strip the SMTP password before returning. Like the Meta CAPI token,
    // the SMTP relay password is a write-only secret — admins should never
    // see it echoed in the form, devtools, or screen-shares. The boolean
    // hasPassword lets the UI render a "saved" indicator instead.
    const smtpRaw = settingsMap.smtp || {}
    const smtp = {
      host: smtpRaw.host || '',
      port: smtpRaw.port || '',
      username: smtpRaw.username || '',
      password: '',
      secure: typeof smtpRaw.secure === 'boolean' ? smtpRaw.secure : true,
      hasPassword: !!(smtpRaw.password && String(smtpRaw.password).length > 0),
    }

    return {
      provider: settingsMap.provider || '',
      fromEmail: settingsMap.fromEmail || '',
      fromName: settingsMap.fromName || '',
      smtp,
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
        secure: true,
        hasPassword: false,
      }
    }
  }
})

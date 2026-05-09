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

    const rawOutbound = String(settingsMap.outbound_delivery || 'smtp').toLowerCase()
    const outboundDelivery = rawOutbound === 'mailerlite' ? 'mailerlite' : 'smtp'
    const smsRaw = settingsMap.mailerlite_sms_enabled
    const mailerliteSmsEnabled =
      smsRaw === true ||
      smsRaw === 'true' ||
      smsRaw === 1 ||
      smsRaw === '1' ||
      (typeof smsRaw === 'string' && smsRaw.toLowerCase() === 'true')

    return {
      provider: settingsMap.provider || '',
      fromEmail: settingsMap.fromEmail || '',
      fromName: settingsMap.fromName || '',
      smtp,
      outboundDelivery,
      mailerliteSmsEnabled,
      /** Boolean only — never exposes the token. Lets the UI warn when MailerLite is chosen but the server has no token. */
      mailerLiteTokenConfigured: !!process.env.MAILERLITE_API_TOKEN?.trim(),
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
      },
      outboundDelivery: 'smtp',
      mailerliteSmsEnabled: false,
      mailerLiteTokenConfigured: false,
    }
  }
})

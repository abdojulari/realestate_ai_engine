import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const { provider, fromEmail, fromName, smtp } = body

  try {
    // Helper function to upsert settings scoped to tenant
    async function upsertSetting(key: string, value: any) {
      if (value === undefined || value === null) return
      
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      const existing = await prisma.setting.findFirst({
        where: { key, adminId }
      })
      if (existing) {
        await prisma.setting.update({
          where: { id: existing.id },
          data: { value: stringValue }
        })
      } else {
        await prisma.setting.create({
          data: { key, value: stringValue, adminId }
        })
      }
    }

    // SMTP password is a write-only secret. The GET endpoint never returns
    // the saved password to the browser, so a normal save round-trip arrives
    // here with smtp.password === '' (or missing). Treat that as "leave
    // current password alone" — only overwrite the column when the admin
    // actually re-typed a non-empty password. Explicit `null` still clears.
    let smtpToPersist: any = smtp
    if (smtp && typeof smtp === 'object') {
      const incomingPwd = (smtp as any).password
      const isEmptyPwd =
        incomingPwd === undefined ||
        (typeof incomingPwd === 'string' && incomingPwd.length === 0)

      if (isEmptyPwd) {
        const existing = await prisma.setting.findFirst({
          where: { key: 'email.smtp', adminId },
        })
        let existingPwd = ''
        if (existing) {
          try {
            const parsed = JSON.parse(existing.value)
            existingPwd = parsed?.password || ''
          } catch { /* ignore */ }
        }
        smtpToPersist = { ...smtp, password: existingPwd }
      }
    }

    // Store all email settings
    await Promise.all([
      upsertSetting('email.provider', provider),
      upsertSetting('email.fromEmail', fromEmail),
      upsertSetting('email.fromName', fromName),
      upsertSetting('email.smtp', smtpToPersist)
    ])

    console.log('✅ Email settings updated successfully')

    return {
      success: true,
      message: 'Email settings updated successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to update email settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update email settings'
    })
  }
})

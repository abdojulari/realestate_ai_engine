import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'

const prisma = new PrismaClient()

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

    // Store all email settings
    await Promise.all([
      upsertSetting('email.provider', provider),
      upsertSetting('email.fromEmail', fromEmail),
      upsertSetting('email.fromName', fromName),
      upsertSetting('email.smtp', smtp)
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

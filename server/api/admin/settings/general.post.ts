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
  const { siteName, supportEmail, phone, timezone, logo } = body

  try {
    // Helper function to upsert settings scoped to tenant
    async function upsertSetting(key: string, value: any) {
      if (value === undefined || value === null) return
      
      const existing = await prisma.setting.findFirst({
        where: { key, adminId }
      })
      if (existing) {
        await prisma.setting.update({
          where: { id: existing.id },
          data: { value: String(value) }
        })
      } else {
        await prisma.setting.create({
          data: { key, value: String(value), adminId }
        })
      }
    }

    // Store all general settings
    await Promise.all([
      upsertSetting('general.siteName', siteName),
      upsertSetting('general.supportEmail', supportEmail),
      upsertSetting('general.phone', phone),
      upsertSetting('general.timezone', timezone),
      upsertSetting('general.logo', logo) // Store as base64 or file path
    ])

    console.log('✅ General settings updated successfully')

    return {
      success: true,
      message: 'General settings updated successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to update general settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update general settings'
    })
  }
})

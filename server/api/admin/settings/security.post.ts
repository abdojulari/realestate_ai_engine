import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const { sessionTimeout, passwordPolicy, twoFactorAuth, ipWhitelisting, whitelistedIps } = body

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

    // Store all security settings
    await Promise.all([
      upsertSetting('security.sessionTimeout', sessionTimeout),
      upsertSetting('security.passwordPolicy', passwordPolicy),
      upsertSetting('security.twoFactorAuth', twoFactorAuth),
      upsertSetting('security.ipWhitelisting', ipWhitelisting),
      upsertSetting('security.whitelistedIps', whitelistedIps)
    ])

    console.log('✅ Security settings updated successfully')

    return {
      success: true,
      message: 'Security settings updated successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to update security settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update security settings'
    })
  }
})

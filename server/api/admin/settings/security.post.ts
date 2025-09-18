import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { sessionTimeout, passwordPolicy, twoFactorAuth, ipWhitelisting, whitelistedIps } = body

  try {
    // Helper function to upsert settings
    async function upsertSetting(key: string, value: any) {
      if (value === undefined || value === null) return
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
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

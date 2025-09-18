import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { provider, fromEmail, fromName, smtp } = body

  try {
    // Helper function to upsert settings
    async function upsertSetting(key: string, value: any) {
      if (value === undefined || value === null) return
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: typeof value === 'object' ? JSON.stringify(value) : String(value) },
        create: { key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }
      })
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

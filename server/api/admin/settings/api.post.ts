import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const apiSettings = await readBody(event)

  try {
    // Helper function to upsert API settings
    async function upsertApiSetting(name: string, settings: any) {
      const key = `api.${name.toLowerCase().replace(/\s+/g, '_')}`
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: JSON.stringify(settings) },
        create: { key, value: JSON.stringify(settings) }
      })
    }

    // Store each API configuration
    for (const api of apiSettings) {
      await upsertApiSetting(api.name, {
        apiKey: api.apiKey,
        apiSecret: api.apiSecret,
        enabled: api.enabled
      })
    }

    console.log('✅ API settings updated successfully')

    return {
      success: true,
      message: 'API settings updated successfully'
    }
  } catch (error: any) {
    console.error('❌ Failed to update API settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update API settings'
    })
  }
})

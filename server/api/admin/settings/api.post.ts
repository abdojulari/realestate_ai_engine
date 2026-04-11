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

  const apiSettings = await readBody(event)

  try {
    // Helper function to upsert API settings scoped to tenant
    async function upsertApiSetting(name: string, settings: any) {
      const key = `api.${name.toLowerCase().replace(/\s+/g, '_')}`
      
      const existing = await prisma.setting.findFirst({
        where: { key, adminId }
      })
      if (existing) {
        await prisma.setting.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(settings) }
        })
      } else {
        await prisma.setting.create({
          data: { key, value: JSON.stringify(settings), adminId }
        })
      }
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

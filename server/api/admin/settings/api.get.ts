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
    // Get all API settings scoped to tenant
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'api.'
        },
        ...tenantFilter
      }
    })

    // Convert to array format expected by frontend
    const apiSettings = [
      {
        name: 'Google Maps',
        apiKey: '',
        apiSecret: '',
        enabled: true,
        verifying: false
      },
      {
        name: 'Stripe',
        apiKey: '',
        apiSecret: '',
        enabled: true,
        verifying: false
      }
    ]

    // Populate with stored values
    settings.forEach(setting => {
      const apiName = setting.key.replace('api.', '').replace(/_/g, ' ')
      const apiIndex = apiSettings.findIndex(api => 
        api.name.toLowerCase() === apiName.toLowerCase()
      )
      
      if (apiIndex !== -1) {
        try {
          const storedSettings = JSON.parse(setting.value)
          apiSettings[apiIndex] = {
            ...apiSettings[apiIndex],
            ...storedSettings
          }
        } catch (error) {
          console.error('Failed to parse API settings:', error)
        }
      }
    })

    return apiSettings
  } catch (error: any) {
    console.error('❌ Failed to load API settings:', error)
    return [
      {
        name: 'Google Maps',
        apiKey: '',
        apiSecret: '',
        enabled: true,
        verifying: false
      },
      {
        name: 'Stripe',
        apiKey: '',
        apiSecret: '',
        enabled: true,
        verifying: false
      }
    ]
  }
})

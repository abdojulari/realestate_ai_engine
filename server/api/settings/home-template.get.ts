import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    // Get the active home template setting
    const setting = await prisma.setting.findFirst({
      where: { key: 'site.homeTemplate', ...tenantFilter }
    })

    const templateNumber = setting ? parseInt(setting.value) : 1
    console.log(`📄 Home template API: Found setting ${setting ? setting.value : 'none'}, returning template ${templateNumber}`)
    
    // Return the template number (default to 1)
    return {
      template: templateNumber
    }
  } catch (error: any) {
    console.error('❌ Failed to load home template setting:', error)
    // Return default template on error
    return {
      template: 1
    }
  }
})

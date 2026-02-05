import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Get the active home template setting
    const setting = await prisma.setting.findUnique({
      where: { key: 'site.homeTemplate' }
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

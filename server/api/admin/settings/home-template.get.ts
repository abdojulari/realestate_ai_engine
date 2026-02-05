import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Get the active home template setting
    const setting = await prisma.setting.findUnique({
      where: { key: 'site.homeTemplate' }
    })

    // Return the template number (default to 1)
    return {
      template: setting ? parseInt(setting.value) : 1
    }
  } catch (error: any) {
    console.error('❌ Failed to load home template setting:', error)
    return {
      template: 1
    }
  }
})

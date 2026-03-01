import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    // Get the active home template setting scoped to tenant
    const setting = await prisma.setting.findFirst({
      where: { key: 'site.homeTemplate', ...tenantFilter }
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

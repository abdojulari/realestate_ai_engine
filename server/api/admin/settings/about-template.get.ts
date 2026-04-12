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
    const setting = await prisma.setting.findFirst({
      where: { key: 'site.aboutTemplate', ...tenantFilter }
    })

    return {
      template: setting ? parseInt(setting.value) : 1
    }
  } catch (error: any) {
    console.error('❌ Failed to load about template setting:', error)
    return {
      template: 1
    }
  }
})

import { defineEventHandler } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

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

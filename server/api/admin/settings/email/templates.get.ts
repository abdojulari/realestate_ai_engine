import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
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
    const templates = await prisma.emailTemplate.findMany({
      where: {
        isActive: true,
        ...tenantFilter
      },
      orderBy: {
        name: 'asc'
      }
    })

    return templates
  } catch (error: any) {
    console.error('❌ Failed to load email templates:', error)
    return []
  }
})

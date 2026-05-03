import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)

    const rules = await prisma.automationRule.findMany({
      where: tenantFilter,
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }],
    })

    return { rules }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to load rules' })
  }
})

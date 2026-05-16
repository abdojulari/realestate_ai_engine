import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantId = getTenantAdminId(user)
  if (tenantId == null) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant scope missing' })
  }

  const promotions = await prisma.partnershipPromotion.findMany({
    where: { adminId: tenantId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return {
    promotions: promotions.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      categoryTag: p.categoryTag,
      description: p.description,
      offerSummary: p.offerSummary,
      websiteUrl: p.websiteUrl,
      logoUrl: p.logoUrl,
      coverImageUrl: p.coverImageUrl,
      approved: p.approved,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  }
})

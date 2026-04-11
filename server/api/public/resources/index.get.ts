import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
export default defineEventHandler(async (event) => {
  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) {
    return []
  }

  const rows = await prisma.marketingResource.findMany({
    where: { adminId, published: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      publicSlug: true,
      mimeType: true,
      createdAt: true,
    },
  })

  return rows
})

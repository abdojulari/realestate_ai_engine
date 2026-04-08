import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const rows = await prisma.marketingResource.findMany({
    where: tenantFilter,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { downloadLeads: true } },
    },
  })

  return rows.map(({ _count, ...r }) => ({
    ...r,
    leadCount: _count.downloadLeads,
  }))
})

import { createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const id = Number(event.context.params?.id)

  const existing = await prisma.marketingResource.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  requireTenantAccess(user, existing.adminId)

  const leads = await prisma.resourceDownloadLead.findMany({
    where: { resourceId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      ipAddress: true,
    },
  })

  return leads
})

import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { mergeWhereOmitExcludedUserLink } from '../../../utils/delegateUserManagement'
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

  const rows = await prisma.propertyInquiry.findMany({
    where: mergeWhereOmitExcludedUserLink(user as any, tenantFilter as Record<string, unknown>),
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { property: { select: { title: true, images: true } }, user: { select: { firstName: true, lastName: true } } }
  })

  return rows.map((r: any) => ({
    id: r.id,
    property: { title: r.property?.title || 'Property', image: Array.isArray(r.property?.images) ? r.property.images[0] : '/favicon.ico' },
    user: { name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() },
    type: r.type || 'inquiry',
    status: r.status || 'pending',
    date: r.createdAt,
    responseTime: ''
  }))
})

import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const p = await prisma.property.findFirst({ where: { id, ...tenantFilter } })
  if (!p) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  requireTenantAccess(user, p.adminId)

  const copy = await prisma.property.create({
    data: {
      title: `${p.title} (Copy)`,
      description: p.description,
      price: p.price,
      beds: p.beds,
      baths: p.baths as any,
      sqft: p.sqft as any,
      type: p.type,
      status: p.status,
      address: p.address,
      city: p.city,
      province: p.province,
      postalCode: p.postalCode,
      latitude: p.latitude,
      longitude: p.longitude,
      features: p.features as any,
      images: p.images as any,
      userId: p.userId,
      adminId: getAdminIdForCreate(user),
      views: 0
    }
  })

  return copy
})

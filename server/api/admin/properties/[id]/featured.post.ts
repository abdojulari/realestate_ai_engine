import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody(event)
  const featured = !!body?.featured

  // Fetch the record first to verify tenant access
  const property = await prisma.property.findFirst({ where: { id, ...tenantFilter } })
  if (!property) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  requireTenantAccess(user, property.adminId)

  const updated = await prisma.property.update({ where: { id }, data: { isFeatured: featured as any } as any })
  return { ok: true, featured: (updated as any).isFeatured }
})

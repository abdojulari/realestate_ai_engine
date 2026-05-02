/**
 * DELETE /api/admin/resources-cms/:id
 * Hard-delete a tenant's resource. ResourceLeads are removed via the FK
 * cascade (`onDelete: Cascade` on the ResourceLead.resourceId relation).
 */
import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = (tenantFilter as any).adminId
  if (!adminId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant could not be determined for this user.' })
  }

  const id = parseInt(event.context.params?.id || '0', 10)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid resource id.' })

  // Tenant scoping happens via the WHERE clause — never delete by id alone.
  const result = await prisma.resource.deleteMany({ where: { id, adminId } })
  if (result.count === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })
  }

  return { success: true }
})

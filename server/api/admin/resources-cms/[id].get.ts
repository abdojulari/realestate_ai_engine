/**
 * GET /api/admin/resources-cms/:id
 * Returns the FULL row including body (HTML). The list endpoint
 * deliberately omits body to keep the listing payload small — the edit
 * dialog hits this endpoint when the admin opens a row.
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

  const row = await prisma.resource.findFirst({
    where: { id, adminId },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Resource not found.' })

  return { success: true, resource: row }
})

import { readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const existing = await prisma.marketingResource.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  requireTenantAccess(user, existing.adminId)

  const body = await readBody(event)

  const resource = await prisma.marketingResource.update({
    where: { id },
    data: {
      title: typeof body.title === 'string' ? body.title : existing.title,
      description:
        typeof body.description === 'string' ? body.description : existing.description,
      published: typeof body.published === 'boolean' ? body.published : existing.published,
      thankYouMessage:
        typeof body.thankYouMessage === 'string'
          ? body.thankYouMessage
          : existing.thankYouMessage,
    },
  })

  return resource
})

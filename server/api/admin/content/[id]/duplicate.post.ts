import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const id = Number((event.context.params as any).id)

  // Verify ownership before duplicating
  const block = await prisma.contentBlock.findFirst({ where: { id, ...tenantFilter } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const copy = await prisma.contentBlock.create({
    data: {
      key: `${block.key}.copy.${Date.now()}`.slice(0, 191),
      title: `${block.title} (Copy)` ,
      type: block.type,
      content: block.content,
      metadata: block.metadata as any,
      adminId
    }
  })
  return copy
})

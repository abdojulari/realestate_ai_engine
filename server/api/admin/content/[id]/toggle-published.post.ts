import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = Number((event.context.params as any).id)

  // Verify ownership before toggling
  const block = await prisma.contentBlock.findFirst({ where: { id, ...tenantFilter } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const meta = ((): any => { try { return typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata || {} } catch { return {} } })()
  const published = !(meta.published ?? true)
  const updated = await prisma.contentBlock.update({ where: { id }, data: { metadata: { ...meta, published } as any } })
  return updated
})

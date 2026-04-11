import { createError, defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeatureForUser(FEATURES.WORKSPACE_TOOLS, user, event)
  const id = parseInt(event.context.params?.id || '0', 10)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const existing = await prisma.workspaceTool.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  requireTenantAccess(user, existing.adminId)

  await prisma.workspaceTool.delete({ where: { id } })
  return { success: true }
})

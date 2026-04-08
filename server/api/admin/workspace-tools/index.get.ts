import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeatureForUser(FEATURES.WORKSPACE_TOOLS, user, event)
  const tenantFilter = getTenantFilter(user)

  const tools = await prisma.workspaceTool.findMany({
    where: { isActive: true, ...tenantFilter },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      kind: true,
      sortOrder: true,
      updatedAt: true,
      adminId: true,
    },
  })

  return { tools }
})

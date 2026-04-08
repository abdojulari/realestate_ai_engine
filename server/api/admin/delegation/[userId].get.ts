import { createError, getRouterParam } from 'h3'
import { requirePrincipalAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const principal = await requirePrincipalAdmin(event)
  const raw = getRouterParam(event, 'userId')
  const userId = parseInt(raw || '', 10)
  if (!Number.isFinite(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const target = await prisma.user.findFirst({
    where: {
      id: userId,
      adminId: principal.id,
      role: 'user',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      delegatedAdminPermissions: true,
      delegationExcludedUserIds: true,
    },
  })

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  }

  return target
})

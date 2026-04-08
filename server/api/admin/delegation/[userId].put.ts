import { createError, getRouterParam, readBody } from 'h3'
import { requirePrincipalAdmin } from '../../../utils/auth'
import { parseDelegatedPermissions } from '../../../utils/adminFeaturePermissions'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const principal = await requirePrincipalAdmin(event)
  const rawId = getRouterParam(event, 'userId')
  const userId = parseInt(rawId || '', 10)
  if (!Number.isFinite(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      adminId: principal.id,
      role: 'user',
    },
    select: { id: true },
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  }

  const body = await readBody<{ permissions?: unknown }>(event)
  const parsed = parseDelegatedPermissions(body?.permissions ?? null)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      delegatedAdminPermissions: parsed === null ? null : (parsed as object),
      ...(parsed === null ? { delegationExcludedUserIds: [] } : {}),
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

  return updated
})

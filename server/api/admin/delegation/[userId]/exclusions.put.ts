import { createError, getRouterParam, readBody } from 'h3'
import { requirePrincipalAdmin } from '../../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const principal = await requirePrincipalAdmin(event)
  const rawId = getRouterParam(event, 'userId')
  const delegateId = parseInt(rawId || '', 10)
  if (!Number.isFinite(delegateId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const delegate = await prisma.user.findFirst({
    where: {
      id: delegateId,
      adminId: principal.id,
      role: 'user',
    },
    select: { id: true },
  })

  if (!delegate) {
    throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  }

  const body = await readBody<{ excludedUserIds?: unknown }>(event)
  const raw = body?.excludedUserIds
  if (!Array.isArray(raw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'excludedUserIds must be an array of user ids',
    })
  }

  const requested = [
    ...new Set(
      raw
        .map((x) => (typeof x === 'string' ? parseInt(x, 10) : Number(x)))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ].filter((id) => id !== delegateId)

  if (requested.length === 0) {
    await prisma.user.update({
      where: { id: delegateId },
      data: { delegationExcludedUserIds: [] },
    })
    return { excludedUserIds: [] as number[] }
  }

  const validRows = await prisma.user.findMany({
    where: {
      id: { in: requested },
      adminId: principal.id,
    },
    select: { id: true },
  })

  const validIds = new Set(validRows.map((r) => r.id))
  if (validIds.size !== requested.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'One or more users are not on your team or cannot be excluded',
    })
  }

  await prisma.user.update({
    where: { id: delegateId },
    data: { delegationExcludedUserIds: requested },
  })

  return { excludedUserIds: requested }
})

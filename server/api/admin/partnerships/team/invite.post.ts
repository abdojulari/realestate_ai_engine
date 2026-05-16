import { defineEventHandler, readBody, createError, getRequestURL } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'
import {
  generateInviteTokenRaw,
  hashInviteToken,
  parseTeamCategory,
} from '../../../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantId = getTenantAdminId(user)
  if (tenantId == null) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant scope missing' })
  }

  const body = await readBody(event)
  const category = parseTeamCategory(body?.category)
  let days = parseInt(String(body?.expiresInDays ?? '14'), 10)
  if (!Number.isFinite(days) || days < 1) days = 14
  if (days > 90) days = 90

  const rawToken = generateInviteTokenRaw()
  const tokenHash = hashInviteToken(rawToken)
  const expiresAt = new Date(Date.now() + days * 86400000)

  await prisma.partnershipTeamInvite.create({
    data: {
      adminId: tenantId,
      category,
      tokenHash,
      expiresAt,
    },
  })

  const origin = getRequestURL(event).origin
  const pathToken = encodeURIComponent(rawToken)

  return {
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
    inviteUrl: `${origin}/team-invite/${pathToken}`,
    category,
  }
})

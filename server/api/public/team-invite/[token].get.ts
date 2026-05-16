import { defineEventHandler, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { hashInviteToken, TEAM_CATEGORY_LABELS } from '../../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'token') || ''
  const token = decodeURIComponent(raw).trim()
  if (!token || token.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invitation link' })
  }

  const tokenHash = hashInviteToken(token)
  const invite = await prisma.partnershipTeamInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      category: true,
      expiresAt: true,
      redeemedAt: true,
    },
  })

  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }

  const expired = invite.expiresAt.getTime() < Date.now()
  const consumed = invite.redeemedAt != null

  return {
    valid: !expired && !consumed,
    expired,
    consumed,
    category: invite.category,
    categoryLabel:
      TEAM_CATEGORY_LABELS[invite.category as keyof typeof TEAM_CATEGORY_LABELS] ?? invite.category,
    expiresAt: invite.expiresAt.toISOString(),
  }
})

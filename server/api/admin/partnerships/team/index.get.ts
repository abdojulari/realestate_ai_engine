import { defineEventHandler, getQuery, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'
import { TEAM_CATEGORY_LABELS } from '../../../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantId = getTenantAdminId(user)
  if (tenantId == null) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant scope missing' })
  }

  const q = getQuery(event)
  const status = (q.status as string) || 'all'

  const where: Record<string, unknown> = { adminId: tenantId }
  if (status === 'pending') where.approved = false
  else if (status === 'approved') where.approved = true

  const members = await prisma.partnershipTeamMember.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      invite: { select: { id: true, expiresAt: true, redeemedAt: true } },
    },
  })

  return {
    members: members.map((m) => ({
      id: m.id,
      category: m.category,
      categoryLabel:
        TEAM_CATEGORY_LABELS[m.category as keyof typeof TEAM_CATEGORY_LABELS] ?? m.category,
      contactName: m.contactName,
      organization: m.organization,
      phone: m.phone,
      email: m.email,
      address: m.address,
      bio: m.bio,
      credentials: m.credentials,
      photoUrl: m.photoUrl,
      approved: m.approved,
      sortOrder: m.sortOrder,
      inviteId: m.inviteId,
      invite: m.invite
        ? {
            expiresAt: m.invite.expiresAt.toISOString(),
            redeemedAt: m.invite.redeemedAt?.toISOString() ?? null,
          }
        : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  }
})

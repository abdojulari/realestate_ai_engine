import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId, requireSameTenantOnly } from '../../../../utils/tenant'
import {
  assertCanApproveTeamMember,
  normalizeEmail,
  normalizePartnershipImageUrl,
  nextAvailableSortOrder,
  parseTeamCategory,
  trimOpt,
  trimStr,
  type TeamCategoryKey,
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

  const id = parseInt(getRouterParam(event, 'id') || '0', 10)
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const existing = await prisma.partnershipTeamMember.findUnique({
    where: { id },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  }
  requireSameTenantOnly(user, existing.adminId)

  const body = await readBody(event)

  let category: TeamCategoryKey = existing.category as TeamCategoryKey
  if (body?.category !== undefined) {
    category = parseTeamCategory(body.category)
    if (existing.approved && category !== (existing.category as TeamCategoryKey)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unpublish this profile before changing its category.',
      })
    }
  }

  const contactName =
    body?.contactName !== undefined ? trimStr(body.contactName, 200) : existing.contactName
  const organization =
    body?.organization !== undefined ? trimStr(body.organization, 300) : existing.organization
  const phone = body?.phone !== undefined ? trimStr(body.phone, 80) : existing.phone
  const email =
    body?.email !== undefined ? normalizeEmail(body.email) : existing.email
  const address = body?.address !== undefined ? trimStr(body.address, 2000) : existing.address
  const bio = body?.bio !== undefined ? trimOpt(body.bio, 4000) : existing.bio
  const credentials =
    body?.credentials !== undefined ? trimOpt(body.credentials, 2000) : existing.credentials
  const photoUrl =
    body?.photoUrl !== undefined ? normalizePartnershipImageUrl(body.photoUrl) : existing.photoUrl

  if (!contactName) throw createError({ statusCode: 400, statusMessage: 'Contact name is required' })
  if (!organization) {
    throw createError({ statusCode: 400, statusMessage: 'Brokerage, bank, or firm name is required' })
  }
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Phone is required' })
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Address is required' })

  let approved = existing.approved
  if (body?.approved !== undefined) {
    approved = Boolean(body.approved)
  }

  let sortOrder = existing.sortOrder
  if (!existing.approved && approved) {
    await assertCanApproveTeamMember(prisma, tenantId, category, existing.id)
    sortOrder = await nextAvailableSortOrder(prisma, tenantId, category)
  } else if (existing.approved && !approved) {
    sortOrder = 0
  } else if (
    body?.sortOrder !== undefined &&
    Number.isFinite(Number(body.sortOrder)) &&
    approved
  ) {
    const n = Number(body.sortOrder)
    if (n >= 0 && n <= 2) sortOrder = n
  }

  const updated = await prisma.partnershipTeamMember.update({
    where: { id },
    data: {
      category,
      contactName,
      organization,
      phone,
      email,
      address,
      bio,
      credentials,
      photoUrl,
      approved,
      sortOrder,
    },
  })

  return { member: updated }
})

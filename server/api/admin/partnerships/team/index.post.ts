import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'
import {
  assertCanApproveTeamMember,
  normalizeEmail,
  normalizePartnershipImageUrl,
  nextAvailableSortOrder,
  parseTeamCategory,
  trimOpt,
  trimStr,
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
  const contactName = trimStr(body?.contactName, 200)
  const organization = trimStr(body?.organization, 300)
  const phone = trimStr(body?.phone, 80)
  const email = normalizeEmail(body?.email)
  const address = trimStr(body?.address, 2000)
  const bio = trimOpt(body?.bio, 4000)
  const credentials = trimOpt(body?.credentials, 2000)
  const photoUrl = normalizePartnershipImageUrl(body?.photoUrl)
  const approved = Boolean(body?.approved)

  if (!contactName) throw createError({ statusCode: 400, statusMessage: 'Contact name is required' })
  if (!organization) {
    throw createError({ statusCode: 400, statusMessage: 'Brokerage, bank, or firm name is required' })
  }
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Phone is required' })
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Address is required' })

  let sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0
  if (sortOrder < 0 || sortOrder > 2) sortOrder = 0

  if (approved) {
    await assertCanApproveTeamMember(prisma, tenantId, category)
    sortOrder = await nextAvailableSortOrder(prisma, tenantId, category)
  }

  const created = await prisma.partnershipTeamMember.create({
    data: {
      adminId: tenantId,
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

  return { member: created }
})

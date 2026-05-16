import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'
import { normalizeOptionalUrl, normalizePartnershipImageUrl, trimStr } from '../../../../utils/partnershipsShared'

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
  const companyName = trimStr(body?.companyName, 300)
  const categoryTag = trimStr(body?.categoryTag, 120)
  const description = trimStr(body?.description, 8000)
  const offerSummaryRaw =
    body?.offerSummary != null && body.offerSummary !== ''
      ? trimStr(body.offerSummary, 500)
      : null
  const offerSummary = offerSummaryRaw && offerSummaryRaw.length > 0 ? offerSummaryRaw : null
  const websiteUrl = normalizeOptionalUrl(body?.websiteUrl)
  const logoUrl = normalizePartnershipImageUrl(body?.logoUrl)
  const coverImageUrl = normalizePartnershipImageUrl(body?.coverImageUrl)
  const approved = body?.approved !== false
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0

  if (!companyName) throw createError({ statusCode: 400, statusMessage: 'Company name is required' })
  if (!categoryTag) throw createError({ statusCode: 400, statusMessage: 'Category is required' })
  if (!description) throw createError({ statusCode: 400, statusMessage: 'Description is required' })

  const created = await prisma.partnershipPromotion.create({
    data: {
      adminId: tenantId,
      companyName,
      categoryTag,
      description,
      offerSummary: offerSummary || null,
      websiteUrl,
      logoUrl,
      coverImageUrl,
      approved,
      sortOrder,
    },
  })

  return { promotion: created }
})

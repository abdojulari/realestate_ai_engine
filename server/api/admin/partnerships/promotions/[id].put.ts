import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId, requireSameTenantOnly } from '../../../../utils/tenant'
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

  const id = parseInt(getRouterParam(event, 'id') || '0', 10)
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const existing = await prisma.partnershipPromotion.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Partner offer not found' })
  }
  requireSameTenantOnly(user, existing.adminId)

  const body = await readBody(event)

  const companyName =
    body?.companyName !== undefined ? trimStr(body.companyName, 300) : existing.companyName
  const categoryTag =
    body?.categoryTag !== undefined ? trimStr(body.categoryTag, 120) : existing.categoryTag
  const description =
    body?.description !== undefined ? trimStr(body.description, 8000) : existing.description
  const offerSummary =
    body?.offerSummary !== undefined
      ? trimStr(body.offerSummary, 500) || null
      : existing.offerSummary
  const websiteUrl =
    body?.websiteUrl !== undefined ? normalizeOptionalUrl(body.websiteUrl) : existing.websiteUrl
  const logoUrl =
    body?.logoUrl !== undefined ? normalizePartnershipImageUrl(body.logoUrl) : existing.logoUrl
  const coverImageUrl =
    body?.coverImageUrl !== undefined
      ? normalizePartnershipImageUrl(body.coverImageUrl)
      : existing.coverImageUrl
  const approved =
    body?.approved !== undefined ? Boolean(body.approved) : existing.approved
  const sortOrder =
    body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : existing.sortOrder

  if (!companyName) throw createError({ statusCode: 400, statusMessage: 'Company name is required' })
  if (!categoryTag) throw createError({ statusCode: 400, statusMessage: 'Category is required' })
  if (!description) throw createError({ statusCode: 400, statusMessage: 'Description is required' })

  const updated = await prisma.partnershipPromotion.update({
    where: { id },
    data: {
      companyName,
      categoryTag,
      description,
      offerSummary,
      websiteUrl,
      logoUrl,
      coverImageUrl,
      approved,
      sortOrder,
    },
  })

  return { promotion: updated }
})

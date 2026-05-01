import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/public/rates/posted
 * ───────────────────────────
 * Returns the tenant's curated lender rate board for the public /rates page.
 * Tenant is resolved from the incoming request domain (subdomain or
 * customDomain), matching how every other public route in this codebase
 * scopes data.
 */
export default defineEventHandler(async (event) => {
  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) {
    return { rates: [], updatedAt: null }
  }

  const rows = await prisma.postedRate.findMany({
    where: { adminId, isPublished: true },
    orderBy: [
      { sortOrder: 'asc' },
      { category: 'asc' },
      { bank: 'asc' },
    ],
    select: {
      id: true,
      bank: true,
      bankLogoUrl: true,
      category: true,
      product: true,
      term: true,
      rate: true,
      effectiveDate: true,
      notes: true,
      highlight: true,
    },
  })

  // The "rates last updated" stamp on the public page is the most recent
  // row-level change — so editors get instant credit for an update without
  // needing to touch every row.
  const newest = await prisma.postedRate.findFirst({
    where: { adminId, isPublished: true },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  })

  return {
    rates: rows,
    updatedAt: newest?.updatedAt ?? null,
  }
})

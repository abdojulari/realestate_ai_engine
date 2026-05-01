import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const ALLOWED_CATEGORIES = new Set([
  'mortgage', 'variable', 'heloc', 'prime', 'consumer', 'business', 'other',
])

function coerceDate(v: unknown): Date | undefined {
  if (v == null || v === '') return undefined
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? undefined : d
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)
  const body = await readBody(event)

  const bank    = String(body?.bank    ?? '').trim()
  const product = String(body?.product ?? '').trim()
  const rate    = Number(body?.rate)
  const category = ALLOWED_CATEGORIES.has(body?.category) ? body.category : 'mortgage'

  if (!bank)    throw createError({ statusCode: 400, statusMessage: 'Bank is required' })
  if (!product) throw createError({ statusCode: 400, statusMessage: 'Product is required' })
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Rate must be a percentage between 0 and 100' })
  }

  const created = await prisma.postedRate.create({
    data: {
      adminId,
      bank,
      product,
      category,
      rate,
      bankLogoUrl: body?.bankLogoUrl?.toString().trim() || null,
      term: body?.term?.toString().trim() || null,
      notes: body?.notes?.toString() || null,
      highlight: !!body?.highlight,
      isPublished: body?.isPublished !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
      effectiveDate: coerceDate(body?.effectiveDate) ?? new Date(),
    },
  })

  return { rate: created }
})

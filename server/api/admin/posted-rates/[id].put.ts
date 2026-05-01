import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'

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
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid rate ID' })

  const existing = await prisma.postedRate.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Rate not found' })
  requireTenantAccess(user, existing.adminId)

  const body = await readBody(event)

  // Only assign keys actually present in the body so the editor can do
  // partial updates (toggle `isPublished`, bump `rate`, etc.) without
  // wiping unrelated fields.
  const data: Record<string, unknown> = {}
  if (body?.bank        !== undefined) data.bank        = String(body.bank).trim()
  if (body?.product     !== undefined) data.product     = String(body.product).trim()
  if (body?.term        !== undefined) data.term        = body.term?.toString().trim() || null
  if (body?.bankLogoUrl !== undefined) data.bankLogoUrl = body.bankLogoUrl?.toString().trim() || null
  if (body?.notes       !== undefined) data.notes       = body.notes?.toString() || null
  if (body?.highlight   !== undefined) data.highlight   = !!body.highlight
  if (body?.isPublished !== undefined) data.isPublished = !!body.isPublished
  if (body?.sortOrder   !== undefined && Number.isFinite(Number(body.sortOrder))) {
    data.sortOrder = Number(body.sortOrder)
  }
  if (body?.category    !== undefined && ALLOWED_CATEGORIES.has(body.category)) {
    data.category = body.category
  }
  if (body?.rate !== undefined) {
    const n = Number(body.rate)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Rate must be between 0 and 100' })
    }
    data.rate = n
  }
  const eff = coerceDate(body?.effectiveDate)
  if (eff) data.effectiveDate = eff

  if (Object.keys(data).length === 0) return { rate: existing }

  const updated = await prisma.postedRate.update({ where: { id }, data })
  return { rate: updated }
})

import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/posted-rates/seed
 * ────────────────────────────────
 * One-click "give me a starter board" — drops the canonical Big Six × common
 * mortgage products grid in for the current tenant so they only need to fill
 * in the actual numbers. Rates default to 0 so it's obvious which rows still
 * need attention.
 *
 * Safe to re-run: only inserts rows that don't already exist for the tenant
 * with the same (bank, product, term) combination.
 */

const BIG_SIX = [
  { bank: 'RBC',           sort: 10 },
  { bank: 'TD',            sort: 20 },
  { bank: 'Scotiabank',    sort: 30 },
  { bank: 'BMO',           sort: 40 },
  { bank: 'CIBC',          sort: 50 },
  { bank: 'National Bank', sort: 60 },
] as const

const PRODUCTS: ReadonlyArray<{ category: string; product: string; term: string | null }> = [
  { category: 'mortgage', product: '5-year fixed', term: 'Closed' },
  { category: 'mortgage', product: '3-year fixed', term: 'Closed' },
  { category: 'mortgage', product: '1-year fixed', term: 'Closed' },
  { category: 'variable', product: 'Variable',     term: 'Closed' },
  { category: 'heloc',    product: 'HELOC',        term: null      },
  { category: 'prime',    product: 'Prime',        term: null      },
]

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  const existing = await prisma.postedRate.findMany({
    where: { adminId },
    select: { bank: true, product: true, term: true },
  })
  const exists = new Set(existing.map(r => `${r.bank}::${r.product}::${r.term ?? ''}`))

  const toCreate = []
  for (const bank of BIG_SIX) {
    for (const p of PRODUCTS) {
      const key = `${bank.bank}::${p.product}::${p.term ?? ''}`
      if (exists.has(key)) continue
      toCreate.push({
        adminId,
        bank: bank.bank,
        category: p.category,
        product: p.product,
        term: p.term,
        rate: 0,
        sortOrder: bank.sort,
        isPublished: false, // hidden until the agent fills in the actual rate
        effectiveDate: new Date(),
      })
    }
  }

  if (toCreate.length === 0) {
    return { created: 0, message: 'No new defaults to seed — every Big Six × product row already exists.' }
  }

  await prisma.postedRate.createMany({ data: toCreate })
  return { created: toCreate.length }
})

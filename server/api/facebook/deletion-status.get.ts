import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * GET /api/facebook/deletion-status?code=<confirmationCode>
 *
 * Public lookup that backs the Meta-mandated "deletion status URL" we
 * return from /api/facebook/data-deletion. The end user navigates to
 * /facebook/deletion-status?code=… in a browser; that Vue page calls this
 * endpoint to confirm we still hold the audit record for their request.
 *
 * We never expose the linked FB user id or any identifying detail — only
 * a yes/no + a completed-at timestamp. That's all Meta requires and all
 * the user actually needs to verify ("yes, my request was processed
 * on 2026-06-17").
 */
export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code?: string }
  if (!code || typeof code !== 'string') {
    return { found: false }
  }

  const row = await prisma.setting.findFirst({
    where: { key: `facebook.deletion.${code}` },
  })
  if (!row) return { found: false }

  let parsed: { completedAt?: string; detachedIntegrations?: number } = {}
  try {
    parsed = JSON.parse(row.value)
  } catch {
    // Audit row exists but is malformed — surface "found" with no detail
    // so the user still sees a confirmation, but log a warning so we know
    // to investigate.
    console.warn(`[Facebook deletion-status] Malformed audit row for code ${code}`)
  }

  return {
    found: true,
    completedAt: parsed.completedAt ?? row.createdAt.toISOString(),
    detachedIntegrations: parsed.detachedIntegrations ?? 0,
  }
})

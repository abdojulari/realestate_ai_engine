import { sendEmail, generateEmailTemplate } from '../../utils/email'
import {
  buildVars,
  exceptionKeyFor,
  fullYearsBetween,
  getEffectiveTemplate,
  isAnniversaryToday,
  renderTemplate,
  type CelebrationKind,
} from '../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/cron/celebrations?secret=...
 *
 * Daily job. For every tenant with CelebrationSettings:
 *   • For each enabled auto-send kind, send the matching emails for "today" and log them.
 *   • Personal anniversaries: bday/wedding/closing where today's month+day matches.
 *   • Fixed holidays: Christmas (Dec 25) and New Year (Jan 1) — skips clients in
 *     the per-client holidayExceptions list.
 *
 * Idempotent: dedupes against CelebrationLog so two cron runs in the same calendar
 * day won't double-send.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const cronSecret = process.env.CRON_SECRET || 'change-me-in-production'
    if (query.secret !== cronSecret) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today)
    const tomorrowStart = new Date(today); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const isXmas = today.getMonth() === 11 && today.getDate() === 25
    const isNewYear = today.getMonth() === 0 && today.getDate() === 1

    const tenants = await prisma.celebrationSettings.findMany({
      include: { admin: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })

    let totalSent = 0, totalSkipped = 0, totalFailed = 0
    const tenantSummaries: Array<Record<string, unknown>> = []

    for (const t of tenants) {
      const adminId = t.adminId
      const admin = t.admin
      if (!admin) { totalSkipped++; continue }

      const clients = await prisma.crmClient.findMany({
        where: { adminId, status: 'active', email: { not: null } },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          dateOfBirth: true, weddingAnniversary: true, closingAnniversary: true,
          holidayExceptions: true,
        },
      })

      // Already-sent index for today (kind+clientId pairs).
      const sentToday = await prisma.celebrationLog.findMany({
        where: { adminId, status: 'ok', sentAt: { gte: todayStart, lt: tomorrowStart } },
        select: { clientId: true, kind: true },
      })
      const sentSet = new Set(sentToday.map(l => `${l.clientId}:${l.kind}`))

      let tenantSent = 0, tenantFailed = 0, tenantSkipped = 0
      const logRows: Array<{ adminId: number; clientId: number; kind: string; subject: string; body: string; mode: string; status: string; error?: string }> = []

      const trySend = async (kind: CelebrationKind, c: typeof clients[number]) => {
        if (sentSet.has(`${c.id}:${kind}`)) { tenantSkipped++; return }
        const exKey = exceptionKeyFor(kind)
        if (exKey && (c.holidayExceptions || []).includes(exKey)) { tenantSkipped++; return }
        const eff = getEffectiveTemplate(kind, t)
        const vars = buildVars(c, admin)
        const subject = renderTemplate(eff.subject, vars)
        const renderedBody = renderTemplate(eff.body, vars)
        const html = generateEmailTemplate(renderedBody, { title: subject })
        try {
          const ok = await sendEmail({ to: c.email!, subject, html })
          if (ok) {
            tenantSent++
            logRows.push({ adminId, clientId: c.id, kind, subject, body: renderedBody, mode: 'auto', status: 'ok' })
            sentSet.add(`${c.id}:${kind}`)
          } else {
            tenantFailed++
            logRows.push({ adminId, clientId: c.id, kind, subject, body: renderedBody, mode: 'auto', status: 'failed', error: 'sendEmail returned false' })
          }
        } catch (e: any) {
          tenantFailed++
          logRows.push({ adminId, clientId: c.id, kind, subject, body: renderedBody, mode: 'auto', status: 'failed', error: e?.message || 'Unknown send error' })
        }
      }

      for (const c of clients) {
        if (t.autoSendBirthday && isAnniversaryToday(c.dateOfBirth, today)) {
          await trySend('birthday', c)
        }
        if (t.autoSendAnniversary && isAnniversaryToday(c.weddingAnniversary, today)) {
          await trySend('anniversary', c)
        }
        if (t.autoSendClosing && isAnniversaryToday(c.closingAnniversary, today)) {
          // Closing anniversary only fires from year 1 onward (no same-day "anniversary").
          if (fullYearsBetween(c.closingAnniversary, today) >= 1) {
            await trySend('closing', c)
          }
        }
        if (t.autoSendChristmas && isXmas) {
          await trySend('christmas', c)
        }
        if (t.autoSendNewYear && isNewYear) {
          await trySend('new_year', c)
        }
      }

      if (logRows.length) {
        await prisma.celebrationLog.createMany({ data: logRows })
      }

      totalSent += tenantSent
      totalSkipped += tenantSkipped
      totalFailed += tenantFailed
      tenantSummaries.push({ adminId, sent: tenantSent, skipped: tenantSkipped, failed: tenantFailed })
    }

    return {
      success: true,
      ranAt: new Date(),
      totals: { sent: totalSent, skipped: totalSkipped, failed: totalFailed, tenants: tenantSummaries.length },
      tenants: tenantSummaries,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

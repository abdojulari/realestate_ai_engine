import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate, getTenantFilter } from '../../../../utils/tenant'
import { sendEmail, generateEmailTemplate } from '../../../../utils/email'
import {
  CELEBRATION_KINDS,
  buildVars,
  exceptionKeyFor,
  getEffectiveTemplate,
  renderTemplate,
  type CelebrationKind,
} from '../../../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/crm/celebrations/bulk-send
 * Body: {
 *   kind: 'christmas' | 'new_year' | 'eid',
 *   mode?: 'auto' | 'custom',
 *   subject?, body?,
 *   clientIds?: number[],   // optional explicit list — overrides "all active with email"
 *   excludeIds?: number[],  // additional ad-hoc exclusions on top of holidayExceptions
 * }
 *
 * Targets active clients with email by default. Clients whose holidayExceptions
 * include the kind are NEVER sent to. Already-sent-today is also skipped.
 *
 * Returns { success, total, sent, skipped, failed, errors }.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)
    const filter = getTenantFilter(user)
    const body = (await readBody(event)) || {}

    const kind = String(body.kind || '') as CelebrationKind
    const mode = (body.mode === 'custom' ? 'custom' : 'auto') as 'auto' | 'custom'
    if (!CELEBRATION_KINDS.includes(kind)) {
      throw createError({ statusCode: 400, message: 'Invalid celebration kind' })
    }
    const exKey = exceptionKeyFor(kind)
    if (!exKey) {
      throw createError({ statusCode: 400, message: 'Bulk send is only supported for fixed/open holidays (christmas, new_year, eid)' })
    }

    const explicitIds = Array.isArray(body.clientIds) ? body.clientIds.map(Number).filter(Boolean) : null
    const excludeIds: number[] = Array.isArray(body.excludeIds) ? body.excludeIds.map(Number).filter(Boolean) : []

    const targets = await prisma.crmClient.findMany({
      where: {
        ...filter,
        status: 'active',
        email: { not: null },
        ...(explicitIds && explicitIds.length ? { id: { in: explicitIds } } : {}),
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, holidayExceptions: true },
    })

    const settings = await prisma.celebrationSettings.findUnique({ where: { adminId } })
    const fullAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true, email: true },
    })
    if (!fullAdmin) throw createError({ statusCode: 500, message: 'Admin record not found' })

    const eff = getEffectiveTemplate(kind, settings)
    const subjectTemplate = mode === 'custom' && body.subject ? String(body.subject) : eff.subject
    const bodyTemplate = mode === 'custom' && body.body ? String(body.body) : eff.body

    // Skip clients we already sent this kind to today (rerun safety).
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const alreadySent = await prisma.celebrationLog.findMany({
      where: { adminId, kind, status: 'ok', sentAt: { gte: todayStart, lt: tomorrowStart } },
      select: { clientId: true },
    })
    const alreadySentSet = new Set(alreadySent.map(l => l.clientId))

    let sent = 0, skipped = 0, failed = 0
    const errors: Array<{ clientId: number; error: string }> = []
    const logRows: Array<{ adminId: number; clientId: number; kind: string; subject: string; body: string; mode: string; status: string; error?: string }> = []

    for (const c of targets) {
      if (!c.email) { skipped++; continue }
      if ((c.holidayExceptions || []).includes(exKey)) { skipped++; continue }
      if (alreadySentSet.has(c.id)) { skipped++; continue }

      const vars = buildVars(c, fullAdmin)
      const subject = renderTemplate(subjectTemplate, vars)
      const html = generateEmailTemplate(renderTemplate(bodyTemplate, vars), { title: subject })
      try {
        const ok = await sendEmail({ to: c.email, subject, html })
        if (ok) {
          sent++
          logRows.push({ adminId, clientId: c.id, kind, subject, body: renderTemplate(bodyTemplate, vars), mode, status: 'ok' })
        } else {
          failed++
          errors.push({ clientId: c.id, error: 'sendEmail returned false' })
          logRows.push({ adminId, clientId: c.id, kind, subject, body: renderTemplate(bodyTemplate, vars), mode, status: 'failed', error: 'sendEmail returned false' })
        }
      } catch (e: any) {
        failed++
        const msg = e?.message || 'Unknown send error'
        errors.push({ clientId: c.id, error: msg })
        logRows.push({ adminId, clientId: c.id, kind, subject, body: renderTemplate(bodyTemplate, vars), mode, status: 'failed', error: msg })
      }
    }

    if (logRows.length) {
      await prisma.celebrationLog.createMany({ data: logRows })
    }

    return { success: true, total: targets.length, sent, skipped, failed, errors }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

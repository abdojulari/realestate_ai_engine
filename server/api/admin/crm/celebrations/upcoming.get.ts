import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { daysUntilNextAnniversary, exceptionKeyFor } from '../../../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * GET /api/admin/crm/celebrations/upcoming?days=14
 *
 * Returns three lists for the current tenant:
 *   • personal:  birthdays + wedding anniversaries + closing anniversaries within `days`
 *   • fixed:     christmas + new_year items if those dates fall within `days`
 *   • todayCount: convenience for the dashboard badge
 *
 * `alreadySentToday` is set per-item so the UI can disable the Send button if a
 * celebration of the same kind was already sent today.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const filter = getTenantFilter(user)
    const query = getQuery(event)
    const days = Math.max(0, Math.min(60, parseInt(String(query.days || '14'), 10) || 14))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today)
    const tomorrowStart = new Date(today); tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    // Pull all clients in tenant that have ANY date set. We do month/day matching in
    // JS because Postgres date-without-year arithmetic is awkward and the typical
    // CRM client list is small (thousands). If this grows, switch to a generated
    // column or a daily materialized view.
    const clients = await prisma.crmClient.findMany({
      where: {
        ...filter,
        OR: [
          { dateOfBirth: { not: null } },
          { weddingAnniversary: { not: null } },
          { closingAnniversary: { not: null } },
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        dateOfBirth: true, weddingAnniversary: true, closingAnniversary: true,
        holidayExceptions: true,
      },
    })

    // Today's logs to know what's already been sent → disables the Send button per item.
    const todaysLogs = await prisma.celebrationLog.findMany({
      where: {
        ...filter,
        sentAt: { gte: todayStart, lt: tomorrowStart },
        status: 'ok',
      },
      select: { clientId: true, kind: true },
    })
    const sentSet = new Set(todaysLogs.map(l => `${l.clientId}:${l.kind}`))

    type Item = {
      kind: 'birthday' | 'anniversary' | 'closing'
      clientId: number
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      date: Date
      daysUntil: number
      alreadySentToday: boolean
    }

    const personal: Item[] = []
    for (const c of clients) {
      const push = (kind: Item['kind'], date: Date | null) => {
        if (!date) return
        const d = daysUntilNextAnniversary(date, today)
        if (d === null || d > days) return
        personal.push({
          kind,
          clientId: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          date,
          daysUntil: d,
          alreadySentToday: sentSet.has(`${c.id}:${kind}`),
        })
      }
      push('birthday', c.dateOfBirth)
      push('anniversary', c.weddingAnniversary)
      push('closing', c.closingAnniversary)
    }
    personal.sort((a, b) => a.daysUntil - b.daysUntil)

    // Fixed holidays (Christmas Dec 25, New Year Jan 1) — surface only when within window.
    const fixed: Array<{ kind: 'christmas' | 'new_year'; date: Date; daysUntil: number; eligibleClientCount: number }> = []
    const xmas = new Date(today.getFullYear(), 11, 25)
    if (xmas < today) xmas.setFullYear(today.getFullYear() + 1)
    const xmasDelta = Math.round((xmas.getTime() - today.getTime()) / 86400000)
    const newYear = new Date(today.getFullYear() + 1, 0, 1)
    if (new Date(today.getFullYear(), 0, 1) >= today) newYear.setFullYear(today.getFullYear())
    const nyDelta = Math.round((newYear.getTime() - today.getTime()) / 86400000)

    const allActive = await prisma.crmClient.count({
      where: { ...filter, status: 'active', email: { not: null } },
    })
    const xmasOuts = await prisma.crmClient.count({
      where: { ...filter, status: 'active', email: { not: null }, holidayExceptions: { has: exceptionKeyFor('christmas')! } },
    })
    const nyOuts = await prisma.crmClient.count({
      where: { ...filter, status: 'active', email: { not: null }, holidayExceptions: { has: exceptionKeyFor('new_year')! } },
    })

    if (xmasDelta <= days) fixed.push({ kind: 'christmas', date: xmas, daysUntil: xmasDelta, eligibleClientCount: allActive - xmasOuts })
    if (nyDelta <= days) fixed.push({ kind: 'new_year', date: newYear, daysUntil: nyDelta, eligibleClientCount: allActive - nyOuts })

    const todayCount = personal.filter(p => p.daysUntil === 0).length

    return { success: true, today: todayStart, days, personal, fixed, todayCount }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

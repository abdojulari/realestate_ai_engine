import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import {
  mergeTenantUserListWhere,
  mergeWhereOmitExcludedUserLink,
} from '../../../utils/delegateUserManagement'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * GET /api/admin/contacts/search?q=...&limit=20
 *
 * Unified contact search for CRM + signing UI: **CrmClient first** (canonical per-tenant customers),
 * then Users, ChatLeads, HomeEstimates, NewsletterSubscribers, Testimonials.
 * Deduplicated by email (first source wins — CRM rows win when present).
 * Scoped by tenant (`requireAdmin` + `getTenantFilter`); super_admin sees all tenants.
 */
export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const query = getQuery(event)
  const q = ((query.q as string) || '').trim().toLowerCase()
  const limit = Math.min(parseInt(query.limit as string) || 20, 50)

  interface ContactResult {
    email: string
    name: string
    source: string
    phone?: string
  }

  const contactMap = new Map<string, ContactResult>()

  // Helper to add contact to deduplicated map (first occurrence wins)
  const addContact = (email: string | null | undefined, name: string, source: string, phone?: string | null) => {
    if (!email) return
    const normalized = email.toLowerCase().trim()
    if (!normalized || contactMap.has(normalized)) return
    contactMap.set(normalized, {
      email: normalized,
      name: name || normalized,
      source,
      phone: phone || undefined,
    })
  }

  try {
    // CRM clients (tenant-scoped; @@unique [adminId, email] — primary customer list)
    const crmClients = await prisma.crmClient.findMany({
      where: {
        ...tenantFilter,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { email: true, firstName: true, lastName: true, phone: true },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    })
    for (const c of crmClients) {
      const em = c.email?.trim()
      if (!em) continue
      addContact(
        em,
        [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || em,
        'CRM',
        c.phone
      )
    }

    // Search Users (scoped by tenant; delegates omit VIP-excluded accounts)
    const userSearchWhere = mergeTenantUserListWhere(user as any, {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    })
    const users = await prisma.user.findMany({
      where: userSearchWhere,
      select: { email: true, firstName: true, lastName: true, phone: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    for (const u of users) {
      addContact(u.email, [u.firstName, u.lastName].filter(Boolean).join(' '), 'User', u.phone)
    }

    // Search ChatLeads (scoped by tenant – has adminId)
    try {
      const leads = await (prisma as any).chatLead.findMany({
        where: {
          ...tenantFilter,
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { name: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: { email: true, name: true, phone: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      for (const l of leads) {
        addContact(l.email, l.name, 'Lead', l.phone)
      }
    } catch {
      // ChatLead table may not exist
    }

    // Search HomeEstimates (scoped by tenant – has adminId)
    try {
      const estimateBase: Record<string, unknown> = {
        ...tenantFilter,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      }
      const estimates = await (prisma as any).homeEstimate.findMany({
        where: mergeWhereOmitExcludedUserLink(user as any, estimateBase),
        select: { email: true, firstName: true, lastName: true, phone: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      for (const e of estimates) {
        if (e.email) {
          addContact(e.email, [e.firstName, e.lastName].filter(Boolean).join(' '), 'Estimate', e.phone)
        }
      }
    } catch {
      // HomeEstimate table may not exist
    }

    // Search NewsletterSubscribers (scoped by tenant – has adminId)
    try {
      const subscribers = await (prisma as any).newsletterSubscriber.findMany({
        where: {
          ...tenantFilter,
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: { email: true, firstName: true, lastName: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      for (const s of subscribers) {
        if (s.email) {
          addContact(s.email, [s.firstName, s.lastName].filter(Boolean).join(' '), 'Subscriber')
        }
      }
    } catch {
      // NewsletterSubscriber table may not exist
    }

    // Search Testimonials (scoped by tenant – has adminId)
    try {
      const testimonials = await (prisma as any).testimonial.findMany({
        where: {
          ...tenantFilter,
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { name: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: { email: true, name: true, phone: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      for (const t of testimonials) {
        if (t.email) {
          addContact(t.email, t.name, 'Testimonial', t.phone)
        }
      }
    } catch {
      // Testimonial table may not exist
    }

    // Convert map to sorted array and apply limit
    const contacts = Array.from(contactMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)

    return { success: true, contacts }
  } catch (error: any) {
    console.error('Contact search error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to search contacts',
    })
  }
})

import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
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
 * Unified CRM contact search across Users, ChatLeads, HomeEstimates,
 * and NewsletterSubscribers. Returns deduplicated contacts by email.
 * All searches are scoped by tenant (super_admin sees all).
 */
export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  // For User model: admin's team members have adminId = admin's id
  const userTenantFilter = user.role === 'super_admin' ? {} : { adminId: user.id }

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
    // Search Users (scoped by tenant)
    const users = await prisma.user.findMany({
      where: {
        ...userTenantFilter,
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
      const estimates = await (prisma as any).homeEstimate.findMany({
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

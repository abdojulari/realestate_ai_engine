import type { PrismaClient } from '@prisma/client'

/**
 * Keep CrmClient aligned with inbound leads (chat, forms, estimates, newsletter, testimonials).
 * One row per (adminId, email); later events enrich phone/source when fields were empty.
 * Does nothing when adminId is missing (no tenant).
 */
export async function upsertCrmClientFromPlatformContact(
  prisma: PrismaClient,
  input: {
    adminId: number | null | undefined
    email: string
    fullName?: string
    firstName?: string
    lastName?: string
    phone?: string | null
    source: string
    sourceId?: number | null
  }
): Promise<void> {
  if (!input.adminId) return
  const email = input.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

  let firstName = (input.firstName || '').trim()
  let lastName = (input.lastName || '').trim()
  if (!firstName && !lastName && input.fullName) {
    const parts = input.fullName.trim().split(/\s+/).filter(Boolean)
    firstName = parts[0] || 'Contact'
    lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName
  }
  if (!firstName) firstName = 'Contact'
  if (!lastName) lastName = firstName

  try {
    const existing = await prisma.crmClient.findUnique({
      where: { adminId_email: { adminId: input.adminId, email } },
    })

    if (existing) {
      const data: { phone?: string; source?: string; sourceId?: number | null } = {}
      const phoneIn = input.phone?.trim()
      if (phoneIn && !existing.phone?.trim()) {
        data.phone = phoneIn
      }
      if (input.source && !existing.source?.trim()) {
        data.source = input.source
      }
      if (input.sourceId != null && existing.sourceId == null) {
        data.sourceId = input.sourceId
      }
      if (Object.keys(data).length > 0) {
        await prisma.crmClient.update({ where: { id: existing.id }, data })
      }
      return
    }

    await prisma.crmClient.create({
      data: {
        adminId: input.adminId,
        email,
        firstName,
        lastName,
        phone: input.phone?.trim() || null,
        type: 'lead',
        status: 'active',
        source: input.source,
        sourceId: input.sourceId ?? null,
      },
    })
  } catch (e) {
    console.error('[crmClientSync] upsertCrmClientFromPlatformContact', e)
  }
}

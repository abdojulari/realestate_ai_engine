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

const PROFILE_PREFERRED_NOTE_RE = /\n*\[Profile\] Preferred contact:[^\n]*/g

/** CRM `metadata` keys written by `syncCrmClientProfileFields` — safe for dashboards / SQL JSON filters. */
export const CRM_PROFILE_METADATA_KEYS = {
  preferredIso: 'profilePreferredContactTimeIso',
  preferredRaw: 'profilePreferredContactTimeRaw',
  syncedAt: 'profilePreferredContactSyncedAt',
} as const

function mergeProfilePreferredMetadata(
  existing: unknown,
  preferredContactTime: string | null | undefined
): Record<string, unknown> {
  const base: Record<string, unknown> =
    existing !== null &&
    existing !== undefined &&
    typeof existing === 'object' &&
    !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}

  const raw = preferredContactTime?.trim()
  delete base[CRM_PROFILE_METADATA_KEYS.preferredIso]
  delete base[CRM_PROFILE_METADATA_KEYS.preferredRaw]
  delete base[CRM_PROFILE_METADATA_KEYS.syncedAt]

  if (!raw) {
    return base
  }

  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    base[CRM_PROFILE_METADATA_KEYS.preferredIso] = d.toISOString()
  } else {
    base[CRM_PROFILE_METADATA_KEYS.preferredRaw] = raw
  }
  base[CRM_PROFILE_METADATA_KEYS.syncedAt] = new Date().toISOString()
  return base
}

function mergePreferredContactNote(notes: string | null | undefined, isoOrEmpty: string | null | undefined): string | null {
  const base = (notes || '').replace(PROFILE_PREFERRED_NOTE_RE, '').trimEnd()
  const raw = isoOrEmpty?.trim()
  if (!raw) {
    return base.length ? base : null
  }
  let label = raw
  try {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      label = d.toISOString()
    }
  } catch {
    /* keep raw */
  }
  const line = `[Profile] Preferred contact: ${label}`
  const merged = base ? `${base}\n${line}` : line
  return merged
}

/**
 * After a portal user updates profile (phone / preferred slot), mirror fields onto CrmClient when tenant-linked.
 */
export async function syncCrmClientProfileFields(
  prisma: PrismaClient,
  input: {
    adminId: number | null | undefined
    email: string
    phone: string
    preferredContactTime?: string | null
    firstName?: string
    lastName?: string
  }
): Promise<void> {
  if (!input.adminId) return
  const email = input.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

  const phone = input.phone.trim()
  const fn = (input.firstName || '').trim() || 'Contact'
  const ln = (input.lastName || '').trim() || fn

  try {
    let row = await prisma.crmClient.findUnique({
      where: { adminId_email: { adminId: input.adminId, email } },
    })

    if (!row) {
      await upsertCrmClientFromPlatformContact(prisma, {
        adminId: input.adminId,
        email: input.email,
        firstName: fn,
        lastName: ln,
        phone,
        source: 'profile',
      })
      row = await prisma.crmClient.findUnique({
        where: { adminId_email: { adminId: input.adminId, email } },
      })
      if (!row) return
    }

    const notes = mergePreferredContactNote(row.notes, input.preferredContactTime ?? null)
    const metadata = mergeProfilePreferredMetadata(row.metadata, input.preferredContactTime ?? null)

    await prisma.crmClient.update({
      where: { id: row.id },
      data: {
        phone: phone || row.phone,
        firstName: fn || row.firstName,
        lastName: ln || row.lastName,
        notes,
        metadata:
          Object.keys(metadata).length > 0
            ? metadata
            : row.metadata === null || row.metadata === undefined
              ? undefined
              : metadata,
      },
    })
  } catch (e) {
    console.error('[crmClientSync] syncCrmClientProfileFields', e)
  }
}

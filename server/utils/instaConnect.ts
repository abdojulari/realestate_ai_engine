/**
 * InstaConnect helpers — slug utilities, branding shape, and capture promotion to CRM.
 */

import type { PrismaClient } from '@prisma/client'
import { upsertCrmClientFromPlatformContact } from './crmClientSync'

export type InterestKind = 'buying' | 'selling' | 'renting' | 'connecting'

export interface InstaConnectBranding {
  headline?: string | null
  company?: string | null
  primaryColor?: string | null
  coverImage?: string | null
  /** [{ icon: 'mdi-instagram', name: 'Instagram', url: '...' }, ...] */
  socialLinks?: Array<{ icon?: string | null; name: string; url: string }>
}

export const INSTA_CONNECT_SOURCE = 'instaconnect'

/** Sanitize an arbitrary string into a URL-safe slug. */
export function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/** Validate a candidate slug — alphanumeric + hyphen, 3–64 chars, no leading/trailing hyphen. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/.test(slug)
}

/**
 * Allocate a unique slug for the given user, deriving from name/email if no candidate is given.
 * Falls back to numeric suffixes on collision (e.g. abdul-ojulari, abdul-ojulari-2, ...).
 */
export async function ensureUniqueSlug(
  prisma: PrismaClient,
  userId: number,
  candidate: string,
): Promise<string> {
  let base = slugify(candidate)
  if (base.length < 3) base = `agent-${userId}`

  let slug = base
  let counter = 1
  while (true) {
    const taken = await prisma.user.findFirst({
      where: { instaConnectSlug: slug, NOT: { id: userId } },
      select: { id: true },
    })
    if (!taken) return slug
    counter += 1
    slug = `${base}-${counter}`.slice(0, 64)
  }
}

/** Coerce raw JSON branding into a normalized shape (always returns a plain object). */
export function parseBranding(raw: unknown): InstaConnectBranding {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: InstaConnectBranding = {}

  if (typeof o.headline === 'string') out.headline = o.headline
  if (typeof o.company === 'string') out.company = o.company
  if (typeof o.primaryColor === 'string') out.primaryColor = o.primaryColor
  if (typeof o.coverImage === 'string') out.coverImage = o.coverImage

  if (Array.isArray(o.socialLinks)) {
    out.socialLinks = o.socialLinks
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((s) => ({
        icon: typeof s.icon === 'string' ? s.icon : null,
        name: String(s.name || '').trim(),
        url: String(s.url || '').trim(),
      }))
      .filter((s) => s.name && /^https?:\/\//i.test(s.url))
  }
  return out
}

/** SHA-256 hex hash of a request IP — never store raw IPs of public visitors. */
export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

/** Promote a pending capture into a CrmClient row (returns the created/linked CrmClient id). */
export async function promoteCaptureToCrm(
  prisma: PrismaClient,
  captureId: number,
): Promise<{ captureId: number; crmClientId: number | null }> {
  const capture = await prisma.instaConnectCapture.findUnique({
    where: { id: captureId },
  })
  if (!capture) {
    throw new Error('Capture not found')
  }
  if (capture.status !== 'pending') {
    return { captureId: capture.id, crmClientId: capture.crmClientId }
  }

  await upsertCrmClientFromPlatformContact(prisma, {
    adminId: capture.adminId,
    email: capture.email,
    firstName: capture.firstName,
    lastName: capture.lastName,
    phone: capture.phone,
    source: INSTA_CONNECT_SOURCE,
    sourceId: capture.id,
  })

  const crmClient = await prisma.crmClient.findUnique({
    where: { adminId_email: { adminId: capture.adminId, email: capture.email.trim().toLowerCase() } },
    select: { id: true },
  })

  await prisma.instaConnectCapture.update({
    where: { id: capture.id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      crmClientId: crmClient?.id ?? null,
    },
  })

  return { captureId: capture.id, crmClientId: crmClient?.id ?? null }
}

/** Build the absolute base URL of the deployment (used to build vCard / share links). */
export function getSiteBaseUrl(event: any): string {
  const config = useRuntimeConfig()
  const fromConfig = (config.public?.siteUrl as string | undefined) || ''
  if (fromConfig) return fromConfig.replace(/\/$/, '')

  const host = event?.node?.req?.headers?.host
  const proto =
    event?.node?.req?.headers?.['x-forwarded-proto'] ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  if (host) return `${proto}://${host}`
  return ''
}

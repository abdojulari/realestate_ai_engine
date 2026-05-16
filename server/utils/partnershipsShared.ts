import { createError } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

export const TEAM_CATEGORY_KEYS = ['mortgage_specialist', 'lawyer', 'home_inspector'] as const
export type TeamCategoryKey = (typeof TEAM_CATEGORY_KEYS)[number]

export const TEAM_CATEGORY_LABELS: Record<TeamCategoryKey, string> = {
  mortgage_specialist: 'Mortgage specialists',
  lawyer: 'Lawyers',
  home_inspector: 'Home inspectors',
}

export const MAX_APPROVED_TEAM_PER_CATEGORY = 3

export function parseTeamCategory(raw: unknown): TeamCategoryKey {
  const s = String(raw ?? '').trim()
  if ((TEAM_CATEGORY_KEYS as readonly string[]).includes(s)) {
    return s as TeamCategoryKey
  }
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid category',
  })
}

export function trimStr(v: unknown, max: number): string {
  const s = String(v ?? '').trim()
  if (s.length > max) return s.slice(0, max)
  return s
}

export function trimOpt(v: unknown, max: number): string | null {
  const s = trimStr(v, max)
  return s === '' ? null : s
}

export function normalizeEmail(v: unknown): string {
  const s = trimStr(v, 320).toLowerCase()
  if (!s.includes('@') || s.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }
  return s
}

export function normalizeOptionalUrl(v: unknown): string | null {
  const s = trimOpt(v, 2048)
  if (!s) return null
  try {
    const u = new URL(s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s}`)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Admin-set images: https URLs or safe relative paths under /uploads or /images. */
export function normalizePartnershipImageUrl(v: unknown): string | null {
  const raw = trimOpt(v, 2048)
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
      return u.toString()
    } catch {
      return null
    }
  }
  if (raw.includes('..') || raw.includes('\\')) return null
  if (raw.startsWith('/uploads/') || raw.startsWith('/images/')) return raw
  return null
}

/**
 * Invited specialists may only attach photos returned by POST …/team-invite/:token/upload
 * (prevents arbitrary URLs in stored profiles).
 */
export function parseInviteSubmittedPhotoUrl(v: unknown): string | null {
  const raw = trimOpt(v, 512)
  if (!raw) return null
  if (!/^\/uploads\/partnerships\/[A-Za-z0-9._-]+$/.test(raw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid profile photo. Please upload an image using the file picker.',
    })
  }
  return raw
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function generateInviteTokenRaw(): string {
  return randomBytes(24).toString('base64url')
}

export async function countApprovedTeamForCategory(
  prisma: PrismaClient,
  adminId: number,
  category: TeamCategoryKey,
  excludeMemberId?: number
): Promise<number> {
  return prisma.partnershipTeamMember.count({
    where: {
      adminId,
      category,
      approved: true,
      ...(excludeMemberId != null ? { id: { not: excludeMemberId } } : {}),
    },
  })
}

export async function assertCanApproveTeamMember(
  prisma: PrismaClient,
  adminId: number,
  category: TeamCategoryKey,
  excludeMemberId?: number
): Promise<void> {
  const n = await countApprovedTeamForCategory(prisma, adminId, category, excludeMemberId)
  if (n >= MAX_APPROVED_TEAM_PER_CATEGORY) {
    throw createError({
      statusCode: 400,
      statusMessage: `You can publish at most ${MAX_APPROVED_TEAM_PER_CATEGORY} approved specialists in this category.`,
    })
  }
}

/** Pick the lowest unused slot in 0..MAX-1 for stable public ordering. */
export async function nextAvailableSortOrder(
  prisma: PrismaClient,
  adminId: number,
  category: TeamCategoryKey
): Promise<number> {
  const rows = await prisma.partnershipTeamMember.findMany({
    where: { adminId, category, approved: true },
    select: { sortOrder: true },
  })
  const used = new Set(rows.map((r) => r.sortOrder))
  for (let i = 0; i < MAX_APPROVED_TEAM_PER_CATEGORY; i++) {
    if (!used.has(i)) return i
  }
  return 0
}

import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../../utils/tenant'
import { resolveStoredUploadUrl } from '../../utils/publicMediaUrl'
import {
  TEAM_CATEGORY_KEYS,
  TEAM_CATEGORY_LABELS,
  MAX_APPROVED_TEAM_PER_CATEGORY,
} from '../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

function publicTeamShape(m: {
  id: number
  category: string
  contactName: string
  organization: string
  phone: string
  email: string
  address: string
  bio: string | null
  credentials: string | null
  photoUrl: string | null
}) {
  return {
    id: m.id,
    category: m.category,
    categoryLabel: TEAM_CATEGORY_LABELS[m.category as keyof typeof TEAM_CATEGORY_LABELS] ?? m.category,
    contactName: m.contactName,
    organization: m.organization,
    phone: m.phone,
    email: m.email,
    address: m.address,
    bio: m.bio,
    credentials: m.credentials,
    photoUrl: resolveStoredUploadUrl(m.photoUrl),
  }
}

export default defineEventHandler(async (event) => {
  const adminId = await resolveTenantFromRequest(event)
  if (!adminId) {
    return { team: {}, partners: [] }
  }

  const [members, promotions] = await Promise.all([
    prisma.partnershipTeamMember.findMany({
      where: { adminId, approved: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.partnershipPromotion.findMany({
      where: { adminId, approved: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 48,
    }),
  ])

  const team: Record<string, ReturnType<typeof publicTeamShape>[]> = {}
  for (const key of TEAM_CATEGORY_KEYS) {
    team[key] = []
  }
  for (const m of members) {
    const bucket = team[m.category]
    if (!bucket || bucket.length >= MAX_APPROVED_TEAM_PER_CATEGORY) continue
    bucket.push(publicTeamShape(m))
  }

  return {
    team,
    partners: promotions.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      categoryTag: p.categoryTag,
      description: p.description,
      offerSummary: p.offerSummary,
      websiteUrl: p.websiteUrl,
      logoUrl: resolveStoredUploadUrl(p.logoUrl),
      coverImageUrl: resolveStoredUploadUrl(p.coverImageUrl),
    })),
  }
})

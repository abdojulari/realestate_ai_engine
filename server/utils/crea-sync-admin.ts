import type { PrismaClient } from '@prisma/client'

/**
 * Tenant admin id for CREA-imported listings (so public /api/properties and subdomains see them).
 *
 * Order: CREA_SYNC_ADMIN_USER_ID → user with SUPER_ADMIN_EMAIL → first super_admin.
 */
export async function resolveCreaSyncAdminId(prisma: PrismaClient): Promise<number | null> {
  const raw = process.env.CREA_SYNC_ADMIN_USER_ID?.trim()
  if (raw && /^\d+$/.test(raw)) {
    const id = parseInt(raw, 10)
    const exists = await prisma.user.findFirst({ where: { id }, select: { id: true } })
    if (exists) return id
  }
  const email = process.env.SUPER_ADMIN_EMAIL?.trim()
  if (email) {
    const u = await prisma.user.findFirst({ where: { email }, select: { id: true } })
    if (u) return u.id
  }
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'super_admin' },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  return superAdmin?.id ?? null
}

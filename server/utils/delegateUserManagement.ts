/**
 * Tenant user access for principals vs delegated assistants, including exclusion list (e.g. VIPs).
 */

import { createError } from 'h3'
import type { PrismaClient } from '@prisma/client'
import type { TenantUser } from './tenant'
import { getTenantAdminId } from './tenant'

export type UserActor = {
  id: number
  role: string
  adminId?: number | null
  delegationExcludedUserIds?: number[] | null
}

export function getDelegationExcludedIds(actor: UserActor): number[] {
  if (actor.role !== 'user') return []
  const ids = actor.delegationExcludedUserIds
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))]
}

/** Merge Prisma where for user list: tenant team + optional exclusion filter for delegates. */
export function mergeTenantUserListWhere(
  actor: UserActor,
  baseWhere: Record<string, unknown>
): Record<string, unknown> {
  const tenantId = getTenantAdminId(actor as TenantUser)
  const teamWhere =
    tenantId === null ? { ...baseWhere } : { ...baseWhere, adminId: tenantId }

  if (actor.role !== 'user') {
    return teamWhere
  }

  const excluded = getDelegationExcludedIds(actor)
  if (excluded.length === 0) {
    return teamWhere
  }

  return {
    AND: [teamWhere, { id: { notIn: excluded } }],
  }
}

/**
 * Super admin: unrestricted. Principal / delegate: target must belong to tenant; delegates respect exclusions.
 */
export function assertCanAccessTenantUser(
  actor: UserActor,
  target: { id: number; adminId: number | null }
): void {
  if (actor.role === 'super_admin') {
    return
  }

  const tenantId = getTenantAdminId(actor as TenantUser)
  if (tenantId == null) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this user',
    })
  }

  if (target.adminId !== tenantId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this user',
    })
  }

  if (actor.role === 'user') {
    const excluded = getDelegationExcludedIds(actor)
    if (excluded.includes(target.id)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this user',
      })
    }
  }
}

/**
 * ActivityLog.userId filter: scoped to the actor's tenant (principal id + team members, minus VIP exclusions for delegates).
 *
 * Tenant isolation is enforced even for `super_admin`. To intentionally view
 * cross-tenant activity (platform support), the caller must pass `{ crossTenant: true }`
 * after gating on `actor.role === 'super_admin'`.
 */
export async function getActivityLogAllowedUserIds(
  prisma: PrismaClient,
  actor: UserActor,
  opts: { crossTenant?: boolean } = {}
): Promise<number[] | 'all'> {
  if (opts.crossTenant && actor.role === 'super_admin') return 'all'

  const tenantId = getTenantAdminId(actor as TenantUser)
  if (tenantId == null) return []

  const memberWhere: Record<string, unknown> = { adminId: tenantId }
  if (actor.role === 'user') {
    const ex = getDelegationExcludedIds(actor)
    if (ex.length) memberWhere.id = { notIn: ex }
  }

  const teamMembers = await prisma.user.findMany({
    where: memberWhere,
    select: { id: true },
  })

  return [...new Set([tenantId, ...teamMembers.map((m) => m.id)])]
}

/**
 * Exclude rows whose `userId` points at a VIP-hidden User (nullable userId = keep).
 */
export function mergeWhereOmitExcludedUserLink(
  actor: UserActor,
  baseWhere: Record<string, unknown>
): Record<string, unknown> {
  if (actor.role !== 'user') return baseWhere
  const ex = getDelegationExcludedIds(actor)
  if (!ex.length) return baseWhere
  return {
    AND: [
      baseWhere,
      { OR: [{ userId: null }, { userId: { notIn: ex } }] },
    ],
  }
}

/**
 * Same for required `userId` (e.g. ViewingRequest).
 */
export function mergeWhereOmitExcludedUserLinkRequired(
  actor: UserActor,
  baseWhere: Record<string, unknown>
): Record<string, unknown> {
  if (actor.role !== 'user') return baseWhere
  const ex = getDelegationExcludedIds(actor)
  if (!ex.length) return baseWhere
  return {
    AND: [baseWhere, { userId: { notIn: ex } }],
  }
}

export function shouldRedactUserId(actor: UserActor, linkedUserId: number | null | undefined): boolean {
  if (actor.role !== 'user' || linkedUserId == null) return false
  return getDelegationExcludedIds(actor).includes(linkedUserId)
}

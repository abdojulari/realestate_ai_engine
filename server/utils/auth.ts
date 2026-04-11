import { createError, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import {
  assertDelegatedRouteAccess,
  hasDelegatedAdminAccess,
  parseDelegatedPermissions,
} from './adminFeaturePermissions'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export async function requireAuth(event: any) {
  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token format'
      })
    }
    
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, secret) as { id: number, email: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        adminId: true,
        subscriptionTier: true,
        delegatedAdminPermissions: true,
        delegationExcludedUserIds: true,
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    return user
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }
    const name = error?.name || ''
    if (name === 'JsonWebTokenError' || name === 'TokenExpiredError' || name === 'NotBeforeError') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token',
      })
    }
    console.error('[requireAuth] Unexpected error:', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporarily unavailable. Please try again.',
    })
  }
}

export function isPrincipalAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

/**
 * Account owner (admin / super_admin) — not a delegated team member.
 */
export async function requirePrincipalAdmin(event: any) {
  const user = await requireAuth(event)
  if (!isPrincipalAdminRole(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only account owners can perform this action',
    })
  }
  return user
}

/**
 * Admin panel: full admins, or delegated users with JSON permissions for the current route.
 */
export async function requireAdmin(event: any) {
  const user = await requireAuth(event)

  if (isPrincipalAdminRole(user.role)) {
    return user
  }

  const perms = parseDelegatedPermissions(user.delegatedAdminPermissions)
  if (user.role !== 'user' || user.adminId == null || !hasDelegatedAdminAccess(perms)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required',
    })
  }

  assertDelegatedRouteAccess(event, perms!)
  return user
}

/**
 * Check if a user has admin privileges (admin or super_admin)
 */
export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

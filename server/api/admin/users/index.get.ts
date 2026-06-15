import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { mergeTenantUserListWhere } from '../../../utils/delegateUserManagement'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const q = getQuery(event)
  const search = (q.search as string) || (q.q as string) || ''
  const role = (q.role as string) || undefined

  const base: Record<string, unknown> = {}
  if (search) {
    base.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (role) {
    base.role = role
  }

  // Platform owner (super_admin) sees every User across every tenant —
  // this surface is for platform-level account management (support, role
  // grants, audits), not for tenant-scoped business data.
  // Regular admin / agent / delegated user see only their own tenant scope
  // (principal + team members, minus VIP exclusions for delegates).
  const where: any =
    user.role === 'super_admin'
      ? base
      : mergeTenantUserListWhere(user as any, base)

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      phone: true,
      adminId: true,
      createdAt: true,
      updatedAt: true,
      // Include the owning tenant principal so super_admin can tell which
      // tenant a user belongs to. Only fetched when needed (small payload).
      admin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  // Map to UI shape. `tenant` is a derived label for display only.
  return users.map((u: any) => {
    const tenant = u.admin
      ? {
          id: u.admin.id,
          name: `${u.admin.firstName || ''} ${u.admin.lastName || ''}`.trim() || u.admin.email,
          email: u.admin.email,
        }
      : u.role === 'super_admin' || u.role === 'admin'
        ? { id: u.id, name: 'Platform / Self', email: u.email, self: true }
        : null
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      phone: u.phone,
      adminId: u.adminId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      tenant,
      status: 'active',
      lastLogin: u.updatedAt,
    }
  })
})

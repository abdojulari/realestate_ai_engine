import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { mergeTenantUserListWhere } from '../../../utils/delegateUserManagement'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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
    if (role === 'crm') {
      base.role = { notIn: ['admin', 'agent'] }
    } else {
      base.role = role
    }
  }

  const where: any = mergeTenantUserListWhere(user as any, base)

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
      createdAt: true,
      updatedAt: true
    }
  })

  // Map to UI shape, add status/lastLogin placeholders
  return users.map((u: any) => ({
    ...u,
    status: 'active',
    lastLogin: u.updatedAt
  }))
})

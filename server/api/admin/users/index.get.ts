import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  // Tenant scoping: super_admin sees all users, admin sees only their team
  const userTenantFilter = user.role === 'super_admin' ? {} : { adminId: user.id }

  const q = getQuery(event)
  const search = (q.search as string) || (q.q as string) || ''
  const role = (q.role as string) || undefined

  const where: any = { ...userTenantFilter }
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  }
  if (role) {
    if (role === 'crm') {
      where.role = { notIn: ['admin', 'agent'] }
    } else {
      where.role = role
    }
  }

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

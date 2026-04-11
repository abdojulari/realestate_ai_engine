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
  const role = (q.role as string) || undefined

  const base: Record<string, unknown> = {}
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
    take: 50,
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
  })

  return users.map((u: any) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    status: 'active',
    lastActive: u.createdAt,
    savedProperties: 0,
    inquiries: 0,
    viewings: 0,
    registrationDate: u.createdAt
  }))
})

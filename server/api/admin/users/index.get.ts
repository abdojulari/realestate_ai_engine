import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const q = getQuery(event)
  const search = (q.search as string) || (q.q as string) || ''
  const role = (q.role as string) || undefined

  const where: any = {}
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  }
  if (role) where.role = role

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



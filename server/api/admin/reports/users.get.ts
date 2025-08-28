import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
  })

  return users.map((u: any) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    status: 'active',
    lastActive: u.createdAt,
    savedProperties: 0,
    inquiries: 0,
    viewings: 0,
    registrationDate: u.createdAt
  }))
})



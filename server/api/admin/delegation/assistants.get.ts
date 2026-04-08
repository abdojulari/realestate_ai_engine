import { requirePrincipalAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const principal = await requirePrincipalAdmin(event)

  const assistants = await prisma.user.findMany({
    where: {
      adminId: principal.id,
      role: 'user',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      delegatedAdminPermissions: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return { assistants }
})

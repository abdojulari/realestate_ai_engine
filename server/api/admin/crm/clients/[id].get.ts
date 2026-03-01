import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) throw createError({ statusCode: 400, message: 'Invalid client ID' })

    const client = await prisma.crmClient.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            checklist: { orderBy: { sortOrder: 'asc' } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!client) throw createError({ statusCode: 404, message: 'Client not found' })
    requireTenantAccess(user, client.adminId)

    return client
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

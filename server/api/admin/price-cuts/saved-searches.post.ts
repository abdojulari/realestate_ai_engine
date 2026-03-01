import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)
    const { name, filters } = body

    if (!name) {
      throw createError({ statusCode: 400, message: 'Search name is required' })
    }

    const search = await prisma.priceCutSearch.create({
      data: {
        name,
        filters: filters || {},
        adminId: getAdminIdForCreate(user)
      }
    })

    return { success: true, search }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

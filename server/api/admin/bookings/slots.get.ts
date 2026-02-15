import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)

    const slots = await prisma.bookingSlot.findMany({
      where: { ...tenantFilter },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })

    return { slots }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

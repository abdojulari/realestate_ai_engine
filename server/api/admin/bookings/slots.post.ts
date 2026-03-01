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

    const {
      dayOfWeek, specificDate, startTime, endTime,
      duration = 30, maxBookings = 1, propertyId, label
    } = body

    if (!startTime || !endTime) {
      throw createError({ statusCode: 400, message: 'Start time and end time are required' })
    }

    const slot = await prisma.bookingSlot.create({
      data: {
        dayOfWeek,
        specificDate: specificDate ? new Date(specificDate) : null,
        startTime,
        endTime,
        duration,
        maxBookings,
        propertyId,
        label,
        adminId: getAdminIdForCreate(user)
      }
    })

    return { success: true, slot }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

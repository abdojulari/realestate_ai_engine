import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const prisma = new PrismaClient()

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

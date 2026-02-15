import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter, resolveTenantFromRequest } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const tenantAdminId = await resolveTenantFromRequest(event)
    const body = await readBody(event)

    const {
      clientName, clientEmail, clientPhone,
      date, time, propertyId, type = 'showing', notes, slotId
    } = body

    if (!clientName || !clientEmail || !date || !time) {
      throw createError({
        statusCode: 400,
        message: 'Client name, email, date, and time are required'
      })
    }

    // Validate slot availability
    const dateTime = new Date(`${date}T${time}:00`)
    const now = new Date()

    if (dateTime <= now) {
      throw createError({ statusCode: 400, message: 'Cannot book in the past' })
    }

    // Check if slot is still available
    if (slotId) {
      const slot = await prisma.bookingSlot.findUnique({ where: { id: slotId } })
      if (!slot || !slot.isActive) {
        throw createError({ statusCode: 400, message: 'This slot is no longer available' })
      }

      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const existingCount = await prisma.booking.count({
        where: {
          slotId,
          dateTime: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' }
        }
      })

      if (existingCount >= slot.maxBookings) {
        throw createError({ statusCode: 409, message: 'This time slot is fully booked' })
      }
    }

    const booking = await prisma.booking.create({
      data: {
        clientName,
        clientEmail,
        clientPhone,
        propertyId,
        dateTime,
        endTime: new Date(dateTime.getTime() + 30 * 60000),
        duration: 30,
        type,
        notes,
        slotId,
        status: 'confirmed',
        adminId: tenantAdminId
      }
    })

    // TODO: Send confirmation email via email queue
    // await sendBookingConfirmation(booking)

    return {
      success: true,
      message: 'Booking confirmed!',
      booking: {
        id: booking.id,
        dateTime: booking.dateTime,
        type: booking.type,
        status: booking.status
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

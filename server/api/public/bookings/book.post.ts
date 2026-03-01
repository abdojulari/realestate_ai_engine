import { getPublicTenantFilter, resolveTenantFromRequest } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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

    // Send confirmation email
    try {
      const { queueEmail } = await import('../../../utils/emailQueue')
      const formattedDate = dateTime.toLocaleDateString('en-CA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      const formattedTime = dateTime.toLocaleTimeString('en-CA', {
        hour: '2-digit', minute: '2-digit'
      })

      await queueEmail({
        to: clientEmail,
        subject: `Booking Confirmed - ${formattedDate}`,
        text: `Hi ${clientName},\n\nYour ${type} booking has been confirmed.\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nType: ${type}\n${notes ? `Notes: ${notes}\n` : ''}\nIf you need to reschedule or cancel, please contact us.\n\nThank you!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Booking Confirmed</h2>
            <p>Hi ${clientName},</p>
            <p>Your <strong>${type}</strong> booking has been confirmed.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Date</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formattedDate}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Time</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formattedTime}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${type}</td></tr>
              ${notes ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Notes</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${notes}</td></tr>` : ''}
            </table>
            <p style="color: #666; font-size: 14px;">If you need to reschedule or cancel, please contact us.</p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('Failed to send booking confirmation email:', emailErr)
    }

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

import { getPublicTenantFilter, resolveTenantFromRequest } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../../../utils/email'
import { generateIcs } from '../../../utils/ics'

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

    // Notify the realtor (admin) with .ics calendar invite
    try {
      if (tenantAdminId) {
        const admin = await prisma.user.findUnique({
          where: { id: tenantAdminId },
          select: { email: true, firstName: true, lastName: true }
        })

        if (admin?.email) {
          const formattedDate = dateTime.toLocaleDateString('en-CA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })
          const formattedTime = dateTime.toLocaleTimeString('en-CA', {
            hour: '2-digit', minute: '2-digit'
          })
          const endTime = new Date(dateTime.getTime() + 30 * 60000)

          let propertyLabel = `Booking #${booking.id}`
          if (propertyId) {
            const prop = await prisma.property.findUnique({
              where: { id: propertyId },
              select: { title: true, address: true, city: true, province: true }
            })
            if (prop) {
              propertyLabel = prop.title || prop.address || propertyLabel
            }
          }

          const icsContent = generateIcs({
            uid: `booking-${booking.id}@suhani`,
            summary: `${type === 'showing' ? 'Showing' : type} – ${clientName}`,
            description: `${type} with ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || 'N/A'}${notes ? `\nNotes: ${notes}` : ''}`,
            location: propertyLabel,
            start: dateTime,
            end: endTime,
            organizerName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
            organizerEmail: admin.email,
            attendeeName: clientName,
            attendeeEmail: clientEmail,
          })

          await sendEmail({
            to: admin.email,
            subject: `New Booking – ${clientName} – ${formattedDate}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                  <h2 style="margin: 0;">New ${type === 'showing' ? 'Showing' : type} Booking</h2>
                </div>
                <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 10px 0; color: #666; width: 120px;">Client</td><td style="padding: 10px 0; font-weight: bold;">${clientName}</td></tr>
                    <tr><td style="padding: 10px 0; color: #666;">Email</td><td style="padding: 10px 0;"><a href="mailto:${clientEmail}">${clientEmail}</a></td></tr>
                    ${clientPhone ? `<tr><td style="padding: 10px 0; color: #666;">Phone</td><td style="padding: 10px 0;"><a href="tel:${clientPhone}">${clientPhone}</a></td></tr>` : ''}
                    <tr><td style="padding: 10px 0; color: #666;">Type</td><td style="padding: 10px 0; font-weight: bold; text-transform: capitalize;">${type}</td></tr>
                    <tr><td style="padding: 10px 0; color: #666;">Date</td><td style="padding: 10px 0; font-weight: bold;">${formattedDate}</td></tr>
                    <tr><td style="padding: 10px 0; color: #666;">Time</td><td style="padding: 10px 0; font-weight: bold;">${formattedTime}</td></tr>
                    ${notes ? `<tr><td style="padding: 10px 0; color: #666;">Notes</td><td style="padding: 10px 0;">${notes}</td></tr>` : ''}
                  </table>
                  <p style="margin-top: 20px; color: #666; font-size: 13px;">
                    A calendar invite (.ics) is attached. Open it to add this to your calendar.
                  </p>
                </div>
              </div>
            `,
            text: `New ${type} Booking\n\nClient: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || 'N/A'}\nDate: ${formattedDate}\nTime: ${formattedTime}${notes ? `\nNotes: ${notes}` : ''}`,
            attachments: [{
              filename: 'booking-invite.ics',
              content: icsContent,
              contentType: 'text/calendar; method=REQUEST',
            }],
          })

          console.log(`[Booking] Realtor notification + .ics sent to ${admin.email}`)
        }
      }
    } catch (realtorEmailErr) {
      console.error('Failed to send realtor booking notification:', realtorEmailErr)
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

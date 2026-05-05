import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../../../utils/email'
import { generateIcs } from '../../../utils/ics'
import { getTenantSiteUrlForEvent } from '../../../utils/tenantSiteUrl'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const propertyId = parseInt(getRouterParam(event, 'id') || '')

  if (!propertyId || isNaN(propertyId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid property ID' })
  }

  const body = await readBody(event)
  const { date, time, notes, property: propertySnapshot } = body

  if (!date || !time) {
    throw createError({ statusCode: 400, statusMessage: 'Date and time are required' })
  }

  const timeMap: Record<string, string> = {
    '9:00 AM': '09:00', '10:00 AM': '10:00', '11:00 AM': '11:00',
    '12:00 PM': '12:00', '1:00 PM': '13:00', '2:00 PM': '14:00',
    '3:00 PM': '15:00', '4:00 PM': '16:00', '5:00 PM': '17:00',
  }
  const time24 = timeMap[time] || time
  const dateTime = new Date(`${date}T${time24}:00`)

  if (isNaN(dateTime.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date/time' })
  }

  if (dateTime <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot schedule viewings in the past' })
  }

  // --- Conflict detection (realtor-wide, not just this property) ---
  // A realtor can only attend one showing at a time across all properties
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { adminId: true },
  })

  if (!prop) {
    throw createError({ statusCode: 404, statusMessage: 'Property not found' })
  }

  const windowStart = new Date(dateTime.getTime() - 30 * 60_000)
  const windowEnd = new Date(dateTime.getTime() + 60 * 60_000)

  const realtorConflictFilter = prop.adminId
    ? { property: { adminId: prop.adminId } }
    : { propertyId }

  const conflictingViewing = await prisma.viewingRequest.findFirst({
    where: {
      ...realtorConflictFilter,
      status: { notIn: ['cancelled', 'rejected'] },
      dateTime: { gte: windowStart, lte: windowEnd },
    },
  })

  const bookingConflictFilter = prop.adminId
    ? { adminId: prop.adminId }
    : { propertyId }

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      ...bookingConflictFilter,
      status: { not: 'cancelled' },
      dateTime: { gte: windowStart, lte: windowEnd },
    },
  })

  const conflictingCalendarEvent = prop.adminId
    ? await prisma.calendarEvent.findFirst({
        where: {
          adminId: prop.adminId,
          type: { in: ['showing', 'meeting'] },
          status: { not: 'cancelled' },
          startTime: { lte: windowEnd },
          endTime: { gte: windowStart },
        },
      })
    : null

  if (conflictingViewing || conflictingBooking || conflictingCalendarEvent) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The realtor is unavailable at this time. Please choose a different time slot.',
    })
  }

  // --- Create viewing request ---
  const viewingRequest = await prisma.viewingRequest.create({
    data: {
      userId: user.id,
      propertyId,
      dateTime,
      status: 'pending',
      notes: notes || null,
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      property: { select: { title: true, address: true, city: true, province: true, adminId: true } },
    },
  })

  // --- Create calendar event for the admin ---
  const adminId = viewingRequest.property.adminId
  if (adminId) {
    try {
      const endTime = new Date(dateTime.getTime() + 60 * 60_000)
      await prisma.calendarEvent.create({
        data: {
          adminId,
          title: `Showing – ${viewingRequest.user.firstName || ''} ${viewingRequest.user.lastName || ''}`.trim(),
          description: `Viewing request for ${viewingRequest.property.title || viewingRequest.property.address}\n\nClient: ${viewingRequest.user.firstName} ${viewingRequest.user.lastName}\nEmail: ${viewingRequest.user.email}\nPhone: ${viewingRequest.user.phone || 'N/A'}${notes ? `\nNotes: ${notes}` : ''}`,
          type: 'showing',
          startTime: dateTime,
          endTime,
          allDay: false,
          location: [viewingRequest.property.address, viewingRequest.property.city, viewingRequest.property.province].filter(Boolean).join(', '),
          color: '#4CAF50',
          status: 'scheduled',
          priority: 'normal',
          propertyId,
          clientId: user.id,
          createdBy: user.id,
        },
      })
    } catch (err) {
      console.error('[ViewingRequest] Failed to create calendar event:', err)
    }
  }

  // --- Email notification to realtor with .ics invite ---
  try {
    const admin = adminId
      ? await prisma.user.findUnique({ where: { id: adminId }, select: { email: true, firstName: true, lastName: true } })
      : null

    if (admin?.email) {
      const clientName = `${viewingRequest.user.firstName || ''} ${viewingRequest.user.lastName || ''}`.trim() || 'A client'
      const propertyTitle = viewingRequest.property.title || viewingRequest.property.address || `Property #${propertyId}`
      const propertyAddress = [viewingRequest.property.address, viewingRequest.property.city, viewingRequest.property.province].filter(Boolean).join(', ')
      const siteUrl = await getTenantSiteUrlForEvent(event, adminId)
      const propertyUrl = `${siteUrl}/property/${propertyId}`
      const formattedDate = dateTime.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const formattedTime = dateTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
      const endTime = new Date(dateTime.getTime() + 60 * 60_000)

      const icsContent = generateIcs({
        uid: `viewing-${viewingRequest.id}@suhani`,
        summary: `Showing – ${clientName} – ${propertyTitle}`,
        description: `Property viewing with ${clientName}.\nEmail: ${viewingRequest.user.email}\nPhone: ${viewingRequest.user.phone || 'N/A'}${notes ? `\nNotes: ${notes}` : ''}`,
        location: propertyAddress,
        start: dateTime,
        end: endTime,
        organizerName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
        organizerEmail: admin.email,
        attendeeName: clientName,
        attendeeEmail: viewingRequest.user.email,
      })

      await sendEmail({
        to: admin.email,
        adminId: viewingRequest.property.adminId ?? null,
        subject: `New Showing Request – ${propertyTitle} – ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="margin: 0;">New Viewing Request</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px 0; color: #666; width: 120px;">Client</td><td style="padding: 10px 0; font-weight: bold;">${clientName}</td></tr>
                <tr><td style="padding: 10px 0; color: #666;">Email</td><td style="padding: 10px 0;"><a href="mailto:${viewingRequest.user.email}">${viewingRequest.user.email}</a></td></tr>
                ${viewingRequest.user.phone ? `<tr><td style="padding: 10px 0; color: #666;">Phone</td><td style="padding: 10px 0;"><a href="tel:${viewingRequest.user.phone}">${viewingRequest.user.phone}</a></td></tr>` : ''}
                <tr><td style="padding: 10px 0; color: #666;">Property</td><td style="padding: 10px 0; font-weight: bold;"><a href="${propertyUrl}" style="color: #1976d2; text-decoration: none;">${propertyTitle}</a></td></tr>
                <tr><td style="padding: 10px 0; color: #666;">Address</td><td style="padding: 10px 0;"><a href="${propertyUrl}" style="color: #333; text-decoration: none;">${propertyAddress}</a></td></tr>
                <tr><td style="padding: 10px 0; color: #666;">Date</td><td style="padding: 10px 0; font-weight: bold;">${formattedDate}</td></tr>
                <tr><td style="padding: 10px 0; color: #666;">Time</td><td style="padding: 10px 0; font-weight: bold;">${formattedTime}</td></tr>
                ${notes ? `<tr><td style="padding: 10px 0; color: #666;">Notes</td><td style="padding: 10px 0;">${notes}</td></tr>` : ''}
              </table>
              <p style="margin-top: 20px; color: #666; font-size: 13px;">
                A calendar invite (.ics) is attached. Open it to add this showing to your calendar.
              </p>
            </div>
          </div>
        `,
        text: `New Viewing Request\n\nClient: ${clientName}\nEmail: ${viewingRequest.user.email}\nPhone: ${viewingRequest.user.phone || 'N/A'}\nProperty: ${propertyTitle}\nAddress: ${propertyAddress}\nDate: ${formattedDate}\nTime: ${formattedTime}${notes ? `\nNotes: ${notes}` : ''}`,
        attachments: [
          {
            filename: 'showing-invite.ics',
            content: icsContent,
            contentType: 'text/calendar; method=REQUEST',
          },
        ],
      })

      console.log(`[ViewingRequest] Email + .ics sent to ${admin.email}`)
    }
  } catch (err) {
    console.error('[ViewingRequest] Failed to send email notification:', err)
  }

  // --- Email confirmation to the client ---
  try {
    const formattedDate = dateTime.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = dateTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    const propertyTitle = viewingRequest.property.title || viewingRequest.property.address || `Property #${propertyId}`
    const clientSiteUrl = await getTenantSiteUrlForEvent(event, viewingRequest.property.adminId)
    const clientPropertyUrl = `${clientSiteUrl}/property/${propertyId}`

    await sendEmail({
      to: viewingRequest.user.email,
      adminId: viewingRequest.property.adminId ?? null,
      subject: `Viewing Confirmed – ${propertyTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Your Viewing is Confirmed</h2>
          <p>Hi ${viewingRequest.user.firstName || 'there'},</p>
          <p>Your property viewing has been scheduled.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Property</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;"><a href="${clientPropertyUrl}" style="color: #1976d2; text-decoration: none;">${propertyTitle}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Date</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formattedDate}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Time</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formattedTime}</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">If you need to reschedule or cancel, please contact us.</p>
        </div>
      `,
      text: `Your Viewing is Confirmed\n\nProperty: ${propertyTitle}\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nIf you need to reschedule or cancel, please contact us.`,
    })
  } catch (err) {
    console.error('[ViewingRequest] Failed to send client confirmation:', err)
  }

  return {
    success: true,
    message: 'Viewing request submitted successfully',
    viewingRequest: {
      id: viewingRequest.id,
      dateTime: viewingRequest.dateTime,
      status: viewingRequest.status,
    },
  }
})

import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const start = query.start ? new Date(query.start as string) : new Date()
    const end = query.end ? new Date(query.end as string) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d })()
    const type = query.type as string

    const where: any = {
      ...tenantFilter,
      startTime: { gte: start, lte: end }
    }
    if (type) where.type = type

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' }
    })

    // Also fetch bookings in this range
    const bookings = await prisma.booking.findMany({
      where: {
        ...tenantFilter,
        dateTime: { gte: start, lte: end },
        status: { not: 'cancelled' }
      },
      orderBy: { dateTime: 'asc' }
    })

    // Convert bookings to calendar event format
    const bookingEvents = bookings.map(b => ({
      id: `booking-${b.id}`,
      bookingId: b.id,
      title: `${b.type === 'showing' ? 'Showing' : b.type} - ${b.clientName}`,
      description: b.notes,
      type: 'booking',
      startTime: b.dateTime,
      endTime: b.endTime || new Date(new Date(b.dateTime).getTime() + b.duration * 60000),
      allDay: false,
      color: '#4CAF50',
      status: b.status,
      metadata: {
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        clientPhone: b.clientPhone,
        propertyId: b.propertyId,
        bookingType: b.type
      }
    }))

    return {
      events: [...events, ...bookingEvents].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { getPublicTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const query = getQuery(event)

    const date = query.date as string // YYYY-MM-DD
    const propertyId = query.propertyId ? parseInt(query.propertyId as string) : undefined

    if (!date) {
      throw createError({ statusCode: 400, message: 'Date is required' })
    }

    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay()

    // Get recurring slots for this day of week
    const recurringSlots = await prisma.bookingSlot.findMany({
      where: {
        ...tenantFilter,
        dayOfWeek,
        isActive: true,
        ...(propertyId && { OR: [{ propertyId }, { propertyId: null }] })
      }
    })

    // Get specific date slots
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const specificSlots = await prisma.bookingSlot.findMany({
      where: {
        ...tenantFilter,
        specificDate: { gte: startOfDay, lte: endOfDay },
        isActive: true,
        ...(propertyId && { OR: [{ propertyId }, { propertyId: null }] })
      }
    })

    const allSlots = [...recurringSlots, ...specificSlots]

    // Get existing bookings for this date to check availability
    const existingBookings = await prisma.booking.findMany({
      where: {
        ...tenantFilter,
        dateTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'cancelled' }
      }
    })

    // Generate available time slots
    const availableSlots = allSlots.flatMap(slot => {
      const times = generateTimeSlots(slot.startTime, slot.endTime, slot.duration)
      return times.map(time => {
        const slotDateTime = new Date(`${date}T${time}:00`)
        const bookingsAtTime = existingBookings.filter(b =>
          Math.abs(new Date(b.dateTime).getTime() - slotDateTime.getTime()) < slot.duration * 60000
        )
        const isAvailable = bookingsAtTime.length < slot.maxBookings

        return {
          slotId: slot.id,
          time,
          duration: slot.duration,
          isAvailable,
          remainingSpots: slot.maxBookings - bookingsAtTime.length,
          label: slot.label
        }
      })
    }).filter(s => s.isAvailable)

    return { date, slots: availableSlots }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  let currentMinutes = startH! * 60 + startM!
  const endMinutes = endH! * 60 + endM!

  while (currentMinutes + duration <= endMinutes) {
    const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
    const m = (currentMinutes % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    currentMinutes += duration
  }

  return slots
}

import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid event ID' })

    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Event not found' })
    requireTenantAccess(user, existing.adminId)

    const {
      title, description, type, startTime, endTime,
      allDay, location, color, status, priority,
      reminders, recurrence, propertyId, clientId, isPublic
    } = body

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(allDay !== undefined && { allDay }),
        ...(location !== undefined && { location }),
        ...(color !== undefined && { color }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(reminders !== undefined && { reminders }),
        ...(recurrence !== undefined && { recurrence }),
        ...(propertyId !== undefined && { propertyId }),
        ...(clientId !== undefined && { clientId }),
        ...(isPublic !== undefined && { isPublic }),
      }
    })

    return { success: true, event: updated }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

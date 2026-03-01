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
      title, description, type = 'task', startTime, endTime,
      allDay = false, location, color, priority = 'normal',
      reminders, recurrence, propertyId, clientId, isPublic = false
    } = body

    if (!title || !startTime) {
      throw createError({ statusCode: 400, message: 'Title and start time are required' })
    }

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        type,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        allDay,
        location,
        color: color || getEventColor(type),
        priority,
        reminders: reminders || [],
        recurrence,
        propertyId,
        clientId,
        isPublic,
        createdBy: user.id,
        adminId: getAdminIdForCreate(user)
      }
    })

    return { success: true, event: calendarEvent }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    task: '#2196F3',
    meeting: '#9C27B0',
    showing: '#4CAF50',
    open_house: '#FF9800',
    reminder: '#F44336',
    personal: '#607D8B',
  }
  return colors[type] || '#2196F3'
}

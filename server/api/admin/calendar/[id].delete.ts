import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) throw createError({ statusCode: 400, message: 'Invalid event ID' })

    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Event not found' })
    requireTenantAccess(user, existing.adminId)

    await prisma.calendarEvent.delete({ where: { id } })

    return { success: true, message: 'Event deleted' }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

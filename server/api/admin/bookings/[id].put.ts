import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid booking ID' })

    const existing = await prisma.booking.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Booking not found' })
    requireTenantAccess(user, existing.adminId)

    const { status, notes, dateTime, endTime } = body

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(dateTime !== undefined && { dateTime: new Date(dateTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
      }
    })

    return { success: true, booking }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

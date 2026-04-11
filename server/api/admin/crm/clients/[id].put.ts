import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid client ID' })

    const existing = await prisma.crmClient.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Client not found' })
    requireTenantAccess(user, existing.adminId)

    const {
      firstName, lastName, email, phone,
      type, status, source, notes, tags
    } = body

    const client = await prisma.crmClient.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
      }
    })

    return { success: true, client }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

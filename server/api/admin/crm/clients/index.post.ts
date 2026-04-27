import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      firstName, lastName, email, phone,
      type = 'lead', source = 'manual', sourceId, notes, tags,
      dateOfBirth, weddingAnniversary, closingAnniversary, holidayExceptions
    } = body

    if (!firstName || !lastName) {
      throw createError({ statusCode: 400, message: 'First name and last name are required' })
    }

    const toDateOrNull = (v: unknown): Date | null | undefined => {
      if (v === undefined) return undefined
      if (v === null || v === '') return null
      const d = new Date(v as string)
      return isNaN(d.getTime()) ? null : d
    }

    const client = await prisma.crmClient.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        type,
        source,
        sourceId,
        notes,
        tags: tags || [],
        adminId: getAdminIdForCreate(user),
        ...(dateOfBirth !== undefined && { dateOfBirth: toDateOrNull(dateOfBirth) }),
        ...(weddingAnniversary !== undefined && { weddingAnniversary: toDateOrNull(weddingAnniversary) }),
        ...(closingAnniversary !== undefined && { closingAnniversary: toDateOrNull(closingAnniversary) }),
        ...(Array.isArray(holidayExceptions) && { holidayExceptions: holidayExceptions.map(String) }),
      }
    })

    return { success: true, message: 'Client created', client }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      firstName, lastName, email, phone,
      type = 'lead', source = 'manual', sourceId, notes, tags
    } = body

    if (!firstName || !lastName) {
      throw createError({ statusCode: 400, message: 'First name and last name are required' })
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
        adminId: getAdminIdForCreate(user)
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

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user) || user.id

    await prisma.facebookIntegration.update({
      where: { adminId },
      data: {
        isActive: false,
        accessToken: null,
        pageAccessToken: null
      }
    })

    return { success: true, message: 'Facebook disconnected' }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

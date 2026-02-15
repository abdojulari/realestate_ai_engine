import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user) || user.id

    const integration = await prisma.facebookIntegration.findUnique({
      where: { adminId }
    })

    if (!integration) {
      return {
        connected: false,
        message: 'Facebook not connected'
      }
    }

    const isTokenValid = integration.tokenExpiry
      ? new Date(integration.tokenExpiry) > new Date()
      : false

    // Count posts
    const postStats = await prisma.facebookPost.groupBy({
      by: ['status'],
      where: { adminId },
      _count: true
    })

    return {
      connected: integration.isActive && isTokenValid,
      pageName: integration.pageName,
      userName: integration.userName,
      permissions: integration.permissions,
      tokenExpiry: integration.tokenExpiry,
      isTokenValid,
      postStats: postStats.reduce((acc, s) => {
        acc[s.status] = s._count
        return acc
      }, {} as Record<string, number>)
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

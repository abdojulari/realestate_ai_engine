import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { getActivityLogAllowedUserIds } from '../../utils/delegateUserManagement'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const skip = (page - 1) * limit

    // Tenant-scoped by default. Super-admins can pass ?scope=all for cross-tenant
    // platform audit; any other caller passing it gets ignored by the helper.
    const crossTenant = (query.scope as string | undefined) === 'all' && user.role === 'super_admin'

    if ((query.scope as string | undefined) === 'all' && user.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only super-admins can view cross-tenant activity logs',
      })
    }

    // ActivityLog.userId: tenant principal + team; delegates omit VIP-excluded user ids.
    const allowedIds = await getActivityLogAllowedUserIds(prisma, user as any, { crossTenant })
    const userIdFilter: Record<string, unknown> =
      allowedIds === 'all' ? {} : { userId: { in: allowedIds } }

    // Get total count
    const total = await prisma.activityLog.count({ where: userIdFilter })

    // Get activity logs with user information
    const activities = await prisma.activityLog.findMany({
      where: userIdFilter,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    // Calculate stats (scoped to tenant)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayActivities = await prisma.activityLog.count({
      where: {
        ...userIdFilter,
        createdAt: {
          gte: today
        }
      }
    })

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeUsers = await prisma.activityLog.findMany({
      where: {
        ...userIdFilter,
        createdAt: {
          gte: last24h
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    const securityEvents = await prisma.activityLog.count({
      where: {
        ...userIdFilter,
        action: {
          in: ['login', 'logout', 'password_change', '2fa_enabled', '2fa_disabled']
        }
      }
    })

    const stats = {
      totalActivities: total,
      todayActivities,
      activeUsers: activeUsers.length,
      securityEvents
    }

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats
    }
  } catch (error: any) {
    console.error('Error fetching activity logs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch activity logs'
    })
  }
})

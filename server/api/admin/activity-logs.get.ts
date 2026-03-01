import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const skip = (page - 1) * limit

    // ActivityLog has userId, not adminId.
    // For admin: scope to the admin's own activity + their team members' activity.
    // For super_admin: no filter (sees all).
    let userIdFilter: any = {}
    if (user.role !== 'super_admin') {
      const teamMembers = await prisma.user.findMany({
        where: { adminId: user.id },
        select: { id: true }
      })
      const teamIds = [user.id, ...teamMembers.map(m => m.id)]
      userIdFilter = { userId: { in: teamIds } }
    }

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

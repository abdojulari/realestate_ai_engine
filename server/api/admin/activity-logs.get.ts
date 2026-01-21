import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.activityLog.count()

    // Get activity logs with user information
    const activities = await prisma.activityLog.findMany({
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

    // Calculate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayActivities = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeUsers = await prisma.activityLog.findMany({
      where: {
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


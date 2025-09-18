import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getRedisClient } from '../utils/redis'
import { getQueueStats } from '../utils/emailQueue'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    requestId: event.context.requestId,
    checks: {
      database: { status: 'unknown', responseTime: 0, error: null },
      redis: { status: 'unknown', available: false, error: null },
      emailQueue: { status: 'unknown', stats: null, error: null },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    }
  }

  // Test database connectivity
  try {
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStartTime,
      error: null
    }
  } catch (error: any) {
    health.checks.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    }
    health.status = 'unhealthy'
  }

  // Test Redis connectivity
  try {
    const redis = getRedisClient()
    if (redis) {
      await redis.ping()
      health.checks.redis = {
        status: 'healthy',
        available: true,
        error: null
      }
    } else {
      health.checks.redis = {
        status: 'disabled',
        available: false,
        error: 'Redis not configured'
      }
    }
  } catch (error: any) {
    health.checks.redis = {
      status: 'unhealthy',
      available: false,
      error: error.message
    }
    // Redis is optional, don't mark overall health as unhealthy
  }

  // Test email queue
  try {
    const queueStats = await getQueueStats()
    health.checks.emailQueue = {
      status: queueStats ? 'healthy' : 'disabled',
      stats: queueStats,
      error: null
    }
  } catch (error: any) {
    health.checks.emailQueue = {
      status: 'unhealthy',
      stats: null,
      error: error.message
    }
    // Email queue is optional, don't mark overall health as unhealthy
  }

  // Calculate total response time
  const totalResponseTime = Date.now() - startTime

  return {
    ...health,
    responseTime: totalResponseTime,
    buildInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  }
})

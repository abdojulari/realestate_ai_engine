import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.document.count({
        where: {
          userId: user.id
        }
      })
    ])

    // Get stats
    const stats = await prisma.document.groupBy({
      by: ['status'],
      where: {
        userId: user.id
      },
      _count: true
    })

    const statsObj = {
      total: total,
      signed: stats.find(s => s.status === 'signed')?._count || 0,
      draft: stats.find(s => s.status === 'draft')?._count || 0,
      pending: stats.find(s => s.status === 'pending')?._count || 0
    }

    return {
      success: true,
      documents,
      stats: statsObj,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error: any) {
    console.error('Get documents error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch documents'
    })
  }
})


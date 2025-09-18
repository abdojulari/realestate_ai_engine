import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const search = (q.search as string) || ''
  const status = (q.status as string) || undefined
  const page = parseInt((q.page as string) || '1')
  const limit = parseInt((q.limit as string) || '20')
  const offset = (page - 1) * limit

  const where: any = {}
  
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  if (status) {
    where.status = status
  }

  const [estimates, total] = await Promise.all([
    prisma.homeEstimate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
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
    prisma.homeEstimate.count({ where })
  ])

  return {
    estimates,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
})

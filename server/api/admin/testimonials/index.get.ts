import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const status = (query.status as string) || undefined // 'pending', 'approved', 'all'
  const page = parseInt((query.page as string) || '1')
  const limit = parseInt((query.limit as string) || '20')
  const offset = (page - 1) * limit

  const where: any = {}
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  if (status === 'pending') {
    where.approved = false
  } else if (status === 'approved') {
    where.approved = true
  }
  // 'all' or undefined = no filter

  const [testimonials, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.testimonial.count({ where })
  ])

  return {
    testimonials,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
})

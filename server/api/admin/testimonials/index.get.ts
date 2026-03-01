import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const status = (query.status as string) || undefined // 'pending', 'approved', 'all'
  const page = parseInt((query.page as string) || '1')
  const limit = parseInt((query.limit as string) || '20')
  const offset = (page - 1) * limit

  const where: any = { ...tenantFilter }
  
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

import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const status = (query.status as string) || undefined
  const page = parseInt((query.page as string) || '1')
  const limit = parseInt((query.limit as string) || '20')
  const offset = (page - 1) * limit

  const scope = (query.scope as string | undefined) || ''

  // Strict tenant isolation — matched adminId only (same as public GET).
  const tenantId = getTenantAdminId(user)
  const where: Record<string, unknown> = {}
  const andParts: Record<string, unknown>[] = []

  if (scope === 'orphans') {
    if (user.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only super-admins can list unattributed testimonials',
      })
    }
    andParts.push({ adminId: null })
  } else if (tenantId != null) {
    andParts.push({ adminId: tenantId })
  } else {
    andParts.push({ id: { in: [] } })
  }

  if (search) {
    andParts.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  if (andParts.length > 0) {
    where.AND = andParts
  }

  if (status === 'pending') {
    where.approved = false
  } else if (status === 'approved') {
    where.approved = true
  }

  if (query.featured === 'true') {
    where.featured = true
  }

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

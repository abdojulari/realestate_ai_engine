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
  const limitRaw = parseInt((query.limit as string) || '20', 10)
  const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : 20
  const offset = limit > 0 ? (page - 1) * limit : 0

  const scope = (query.scope as string | undefined) || ''

  // Tenant isolation:
  // • Delegated / broker `admin` → only rows where testimonial.adminId = their tenant user id.
  // • `super_admin` → broker testimonials are keyed by *that broker's* User.id (e.g. 1), not
  //   necessarily the super-admin's own User.id, so we must NOT filter by getTenantAdminId() here
  //   or the UI shows 0 even though rows exist under adminId=1.
  //   Optional: ?tenantAdminId=1 to narrow to one broker.
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
  } else if (user.role === 'super_admin') {
    const rawTa = query.tenantAdminId
    if (rawTa !== undefined && rawTa !== null && String(rawTa).trim() !== '') {
      const aid = parseInt(String(rawTa), 10)
      if (!Number.isNaN(aid) && aid > 0) {
        andParts.push({ adminId: aid })
      }
    }
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
      ...(limit > 0 ? { take: limit } : { take: 0 }),
    }),
    prisma.testimonial.count({ where }),
  ])

  const pages = limit > 0 ? Math.ceil(total / limit) : total > 0 ? 1 : 0

  return {
    testimonials,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  }
})

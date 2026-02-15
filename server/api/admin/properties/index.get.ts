import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const tenantFilter = getTenantFilter(admin)

  const q = getQuery(event)
  const search = (q.search as string) || ''
  const type = (q.type as string) || undefined
  const status = (q.status as string) || undefined
  const sortBy = (q.sortBy as string) || 'newest'
  const source = (q.source as string) || undefined        // 'manual', 'crea', 'pillar9'
  const onlyManual = q.only_manual === 'true'             // shortcut: only manual listings
  const page = parseInt((q.page as string) || '1', 10)
  const limit = 12

  const where: any = { ...tenantFilter }

  // Source filter: the correct way to separate manual vs synced
  if (onlyManual) {
    where.source = 'manual'
  } else if (source) {
    where.source = source
  }

  // Basic filters
  if (type) where.type = type.toLowerCase()
  if (status) where.status = status.toLowerCase().replace(' ', '_')

  // Search
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { mlsNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: any =
    sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : sortBy === 'views' ? { views: 'desc' }
    : { createdAt: 'desc' }

  const skip = (page - 1) * limit
  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        status: true,
        beds: true,
        baths: true,
        sqft: true,
        address: true,
        city: true,
        province: true,
        images: true,
        views: true,
        source: true,
        mlsNumber: true,
        createdAt: true,
      },
    }),
    prisma.property.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  const data = properties.map((p: any) => ({
    ...p,
    type: (p.type || '').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
    status: (p.status || '').replace('_', ' ').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
    images: Array.isArray(p.images)
      ? p.images
      : typeof p.images === 'string'
        ? (() => { try { return JSON.parse(p.images) } catch { return [] } })()
        : [],
  }))

  return {
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
})

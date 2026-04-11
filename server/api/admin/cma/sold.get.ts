import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { creaService } from '../../../utils/crea.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function parseDateRange(range?: string, startDate?: string, endDate?: string) {
  const now = new Date()
  if (range && range !== 'custom') {
    const days = range === 'last_30' ? 30
      : range === 'last_90' ? 90
      : range === 'last_180' ? 180
      : range === 'last_365' ? 365
      : null
    if (days) {
      return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), lte: now }
    }
  }
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { gte: start, lte: end }
    }
  }
  return null
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const province = (q.province as string) || undefined
  const city = (q.city as string) || undefined
  const community = (q.community as string) || undefined
  const range = (q.range as string) || 'last_90'
  const startDate = q.startDate as string | undefined
  const endDate = q.endDate as string | undefined
  const limit = parseInt((q.limit as string) || '100')
  const page = parseInt((q.page as string) || '1')
  const skip = (page - 1) * limit

  const where: any = { status: 'sold' }
  if (province) {
    const provinceMap: Record<string, string> = {
      Alberta: 'AB',
      'British Columbia': 'BC',
      Saskatchewan: 'SK',
      Manitoba: 'MB',
      Ontario: 'ON'
    }
    const normalized = province.trim()
    const code = provinceMap[normalized] || Object.keys(provinceMap).find(key => provinceMap[key] === normalized) || undefined
    const provinceFilters = [{ province: { equals: normalized, mode: 'insensitive' } }]
    if (code && code !== normalized) {
      provinceFilters.push({ province: { equals: code, mode: 'insensitive' } })
    }
    where.AND = [...(where.AND || []), { OR: provinceFilters }]
  }
  if (city) where.city = { contains: city, mode: 'insensitive' }
  if (community) where.cityRegion = { contains: community, mode: 'insensitive' }

  const dateFilter = parseDateRange(range, startDate, endDate)
  const shouldFilterBySoldDate = Boolean(dateFilter)

  const fetchLimit = shouldFilterBySoldDate ? 1000 : limit
  const fetchSkip = shouldFilterBySoldDate ? 0 : skip

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: fetchLimit,
      skip: fetchSkip,
      select: {
        id: true,
        title: true,
        price: true,
        beds: true,
        baths: true,
        sqft: true,
        type: true,
        status: true,
        address: true,
        city: true,
        cityRegion: true,
        province: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        images: true,
        features: true,
        description: true,
        updatedAt: true,
        createdAt: true,
        source: true,
        externalId: true
      }
    })
  ])

  let backfillCount = 0
  const enriched = await Promise.all(properties.map(async (property: any) => {
    const features = typeof property.features === 'string' ? JSON.parse(property.features || '{}') : property.features || {}
    let soldDate = features.statusChangeTimestamp || null

    if (!soldDate && property.source === 'crea' && property.externalId && backfillCount < 50) {
      try {
        backfillCount += 1
        const remote = await creaService.getPropertyById(property.externalId)
        const rawStatusDate = remote?.StatusChangeTimestamp
        const normalized = rawStatusDate ? rawStatusDate.replace(/^"+|"+$/g, '') : null
        if (normalized && !isNaN(new Date(normalized).getTime())) {
          soldDate = new Date(normalized).toISOString()
          features.statusChangeTimestamp = soldDate
          await prisma.property.update({
            where: { id: property.id },
            data: { features }
          })
        }
      } catch (error) {
        // Silently handle - property may not exist in CREA anymore
      }
    }

    // Use statusChangeTimestamp if available, otherwise fall back to updatedAt
    const effectiveSoldDate = soldDate || (property.updatedAt ? new Date(property.updatedAt).toISOString() : null)

    return {
      ...property,
      features,
      soldDate: effectiveSoldDate
    }
  }))

  const filtered = shouldFilterBySoldDate
    ? enriched.filter((property: any) => {
        // Use soldDate for filtering (which now falls back to updatedAt)
        if (!property.soldDate) return false
        const d = new Date(property.soldDate)
        if (isNaN(d.getTime())) return false
        return d >= (dateFilter as any).gte && d <= (dateFilter as any).lte
      })
    : enriched

  const paged = shouldFilterBySoldDate ? filtered.slice(skip, skip + limit) : filtered
  const totalCount = shouldFilterBySoldDate ? filtered.length : total

  return {
    properties: paged,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
  }
})

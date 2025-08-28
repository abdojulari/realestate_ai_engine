import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const q = getQuery(event)
  const search = (q.search as string) || ''
  const type = (q.type as string) || undefined
  const status = (q.status as string) || undefined
  const sortBy = (q.sortBy as string) || 'newest'

  const where: any = {}
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
    ]
  }
  if (type) where.type = type.toLowerCase()
  if (status) where.status = status.toLowerCase().replace(' ', '_')

  const orderBy: any = sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : sortBy === 'views' ? { views: 'desc' }
    : { createdAt: 'desc' }

  const properties = await prisma.property.findMany({
    where,
    orderBy,
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
      images: true,
      views: true
    }
  })

  return properties.map((p: any) => ({
    ...p,
    type: (p.type || '').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
    status: (p.status || '').replace('_', ' ').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
    images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images) } catch { return ['/favicon.ico'] } })() : ['/favicon.ico'])
  }))
})



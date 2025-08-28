import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  // For simplicity return latest N properties with basic metrics
  const props = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, title: true, price: true, images: true, status: true, createdAt: true,
      views: true
    }
  })

  return props.map((p: any) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    image: Array.isArray(p.images) ? p.images[0] : (typeof p.images === 'string' ? (JSON.parse(p.images || '[]')[0] || '/favicon.ico') : '/favicon.ico'),
    views: p.views || 0,
    inquiries: 0,
    viewings: 0,
    status: (p.status || '').replace('_', ' '),
    listedDate: p.createdAt
  }))
})



import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    includeCrea = 'true',
    includeManual = 'true',
    limit = '10',
    city
  } = query

  const where: any = {}
  
  // Source filtering
  const sourceFilter = []
  if (includeManual === 'true') sourceFilter.push('manual')
  if (includeCrea === 'true') sourceFilter.push('crea')
  
  if (sourceFilter.length > 0) {
    where.source = { in: sourceFilter }
  }

  // City filtering
  if (city) {
    where.city = { contains: city as string, mode: 'insensitive' }
  }

  // Only show active properties
  where.status = 'for_sale'

  const properties = await prisma.property.findMany({
    where,
    orderBy: [
      { views: 'desc' },
      { updatedAt: 'desc' }
    ],
    take: parseInt(limit as string),
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  })

  return properties.map((p: any) => ({
    ...p,
    images: typeof p.images === 'string' ? JSON.parse(p.images as any) : p.images,
    features: typeof p.features === 'string' ? JSON.parse(p.features as any) : p.features,
    agent: p.user,
    // Add indicators for UI
    isMLS: p.source === 'crea',
    isBuilder: p.source === 'manual'
  }))
})



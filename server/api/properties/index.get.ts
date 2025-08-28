import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    minPrice,
    maxPrice,
    beds,
    baths,
    type,
    status,
    city,
    province
  } = query

  const where: any = {}

  if (minPrice || maxPrice) {
    where.price = {
      gte: minPrice ? parseFloat(minPrice as string) : undefined,
      lte: maxPrice ? parseFloat(maxPrice as string) : undefined,
    }
  }

  if (beds) where.beds = { gte: parseInt(beds as string) }
  if (baths) where.baths = { gte: parseFloat(baths as string) }
  if (type) where.type = type
  if (status) where.status = status
  if (city) where.city = city
  if (province) where.province = province

  const properties = await prisma.property.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  // Transform the response to match expected format
  return properties.map(property => ({
    ...property,
    images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
    features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
    agent: property.user
  }))
})

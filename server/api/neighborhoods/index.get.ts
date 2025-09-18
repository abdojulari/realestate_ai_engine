import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    city,
    province,
    search,
    orderBy = 'propertyCount',
    order = 'desc',
    limit = '50',
    page = '1'
  } = query

  const where: any = {}
  
  // Filter by city if provided
  if (city) {
    where.city = { contains: city as string, mode: 'insensitive' }
  }
  
  // Filter by province if provided
  if (province) {
    where.province = { contains: province as string, mode: 'insensitive' }
  }
  
  // Search in neighborhood name, city, or province
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { city: { contains: search as string, mode: 'insensitive' } },
      { province: { contains: search as string, mode: 'insensitive' } }
    ]
  }

  // Parse pagination
  const limitNum = parseInt(limit as string) || 50
  const pageNum = parseInt(page as string) || 1
  const skip = (pageNum - 1) * limitNum

  // Define order by clause
  const orderByClause: any = {}
  if (orderBy === 'propertyCount') {
    orderByClause.propertyCount = order as 'asc' | 'desc'
  } else if (orderBy === 'averagePrice') {
    orderByClause.averagePrice = order as 'asc' | 'desc'
  } else if (orderBy === 'name') {
    orderByClause.name = order as 'asc' | 'desc'
  } else {
    orderByClause.propertyCount = 'desc' // Default
  }

  // Get total count for pagination
  const totalCount = await prisma.neighborhood.count({ where })
  const totalPages = Math.ceil(totalCount / limitNum)

  // Get neighborhoods
  const neighborhoods = await prisma.neighborhood.findMany({
    where,
    include: {
      _count: {
        select: { properties: true }
      }
    },
    orderBy: orderByClause,
    skip,
    take: limitNum
  })

  // Format response
  const formattedNeighborhoods = neighborhoods.map(neighborhood => ({
    id: neighborhood.id,
    name: neighborhood.name,
    city: neighborhood.city,
    province: neighborhood.province,
    country: neighborhood.country,
    propertyCount: neighborhood.propertyCount,
    averagePrice: neighborhood.averagePrice,
    confidence: neighborhood.confidence,
    formattedAddress: neighborhood.formattedAddress,
    centerLatitude: neighborhood.centerLatitude,
    centerLongitude: neighborhood.centerLongitude,
    createdAt: neighborhood.createdAt,
    updatedAt: neighborhood.updatedAt
  }))

  return {
    neighborhoods: formattedNeighborhoods,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  }
})

import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const neighborhoodId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const {
    limit = '10',
    page = '1',
    minPrice,
    maxPrice,
    type,
    status = 'for_sale'
  } = query

  if (!neighborhoodId || isNaN(parseInt(neighborhoodId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid neighborhood ID'
    })
  }

  const where: any = {
    neighborhood: {
      neighborhoodId: parseInt(neighborhoodId)
    }
  }

  // Add filters
  if (minPrice || maxPrice) {
    where.price = {
      gte: minPrice ? parseFloat(minPrice as string) : undefined,
      lte: maxPrice ? parseFloat(maxPrice as string) : undefined,
    }
  }

  if (type) {
    where.type = type as string
  }

  if (status) {
    where.status = status as string
  }

  // Parse pagination
  const limitNum = parseInt(limit as string) || 10
  const pageNum = parseInt(page as string) || 1
  const skip = (pageNum - 1) * limitNum

  // Get total count
  const totalCount = await prisma.property.count({ where })
  const totalPages = Math.ceil(totalCount / limitNum)

  // Get properties
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
      neighborhood: {
        include: {
          neighborhood: {
            select: {
              id: true,
              name: true,
              city: true,
              province: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    skip,
    take: limitNum
  })

  // Format properties
  const formattedProperties = properties.map(property => {
    // Parse enhanced CREA agent data
    const listingAgentData = typeof property.listingAgentData === 'string' ? JSON.parse(property.listingAgentData) : property.listingAgentData
    const listingOfficeData = typeof property.listingOfficeData === 'string' ? JSON.parse(property.listingOfficeData) : property.listingOfficeData
    
    // Extract simple agent/office names for display
    let listingAgent = null
    let listingOffice = null
    
    if (listingAgentData) {
      listingAgent = listingAgentData.fullName || 
        (listingAgentData.firstName && listingAgentData.lastName 
          ? `${listingAgentData.firstName} ${listingAgentData.lastName}`
          : null)
    }
    
    if (listingOfficeData) {
      listingOffice = listingOfficeData.name
    }

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      type: property.type,
      status: property.status,
      address: property.address,
      city: property.city,
      province: property.province,
      postalCode: property.postalCode,
      latitude: property.latitude,
      longitude: property.longitude,
      features: property.features,
      images: property.images,
      views: property.views,
      source: property.source,
      externalId: property.externalId,
      mlsNumber: property.mlsNumber,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      user: property.user,
      neighborhood: property.neighborhood?.neighborhood || null,
      
      // Simple agent/office fields for display
      listingAgent,
      listingOffice,
      
      // Enhanced agent data for detailed views
      listingAgentData,
      listingOfficeData,
      coListingAgentsData: typeof property.coListingAgentsData === 'string' ? JSON.parse(property.coListingAgentsData) : property.coListingAgentsData,
      coListingOfficesData: typeof property.coListingOfficesData === 'string' ? JSON.parse(property.coListingOfficesData) : property.coListingOfficesData,
      
      // Add indicators for UI
      isMLS: property.source === 'crea',
      isBuilder: property.source === 'manual',
      agent: property.user
    }
  })

  return {
    properties: formattedProperties,
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

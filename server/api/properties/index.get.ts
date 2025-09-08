import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    minPrice,
    maxPrice,
    beds,
    bedsExact, // New parameter for exact bedroom match
    baths,
    type,
    status,
    city,
    province,
    location,
    minSqft,
    maxSqft,
    features,
    source, // New parameter to filter by data source
    includeCrea = 'true', // Include CREA data by default
    includeManual = 'true', // Include manual data by default
    limit = '10', // Default to 10 properties per page
    page = '1' // Default to page 1
  } = query

  const where: any = {}

  // Source filtering - combine both manual and CREA by default
  const sourceFilter = []
  if (source) {
    // Specific source requested
    where.source = source
  } else {
    // Include both based on parameters
    if (includeManual === 'true') sourceFilter.push('manual')
    if (includeCrea === 'true') sourceFilter.push('crea')
    
    if (sourceFilter.length > 0) {
      where.source = { in: sourceFilter }
    }
  }

  // Price range filter
  if (minPrice || maxPrice) {
    where.price = {
      gte: minPrice ? parseFloat(minPrice as string) : undefined,
      lte: maxPrice ? parseFloat(maxPrice as string) : undefined,
    }
  }

  // Square footage filter
  if (minSqft || maxSqft) {
    where.sqft = {
      gte: minSqft ? parseInt(minSqft as string) : undefined,
      lte: maxSqft ? parseInt(maxSqft as string) : undefined,
    }
  }

  // Basic filters
  if (beds) where.beds = { gte: parseInt(beds as string) }
  if (bedsExact) where.beds = parseInt(bedsExact as string) // Exact match for AI search
  if (baths) where.baths = { gte: parseFloat(baths as string) }
  if (type) where.type = type
  if (status) where.status = status
  if (city) where.city = { contains: city as string, mode: 'insensitive' }
  if (province) where.province = province

  // Location filter (search in city, address, or postal code)
  if (location && !city) {
    where.OR = [
      { city: { contains: location as string, mode: 'insensitive' } },
      { address: { contains: location as string, mode: 'insensitive' } },
      { postalCode: { contains: location as string, mode: 'insensitive' } }
    ]
  }

  // Features filter - store feature requirements for post-processing
  let requiredFeatures: string[] = []
  if (features) {
    const featureArray = Array.isArray(features) ? features : [features]
    requiredFeatures = featureArray.map(f => f.toLowerCase().replace(/\s+/g, ''))
    console.log('🔍 Features will be filtered post-query:', requiredFeatures)
  }

  // Pagination parameters
  const limitNum = parseInt(limit as string) || 10
  const pageNum = parseInt(page as string) || 1
  const skip = (pageNum - 1) * limitNum

  console.log(`📄 Properties API: page=${pageNum}, limit=${limitNum}, skip=${skip}`)

  // Get total count for pagination info
  const totalCount = await prisma.property.count({ where })
  const totalPages = Math.ceil(totalCount / limitNum)

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
    orderBy: [
      { source: 'asc' }, // Manual properties first, then CREA
      { updatedAt: 'desc' }
    ],
    take: limitNum,
    skip: skip
  })

  let formattedProperties = properties.map(property => ({
    ...property,
    images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
    features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
    agent: property.user,
    // Add indicators for UI
    isMLS: property.source === 'crea',
    isBuilder: property.source === 'manual'
  }))

  // Apply feature filtering post-query (since Prisma JSON filtering is problematic)
  if (requiredFeatures.length > 0) {
    console.log('🔍 Applying post-query feature filtering for:', requiredFeatures)
    formattedProperties = formattedProperties.filter(property => {
      const features = property.features
      if (!features) return false
      
      return requiredFeatures.every(feature => {
        // Search EVERYWHERE in the property data for the feature
        const searchText = [
          property.description || '',
          property.title || '',
          JSON.stringify(features.appliances || []),
          JSON.stringify(features.interiorFeatures || []),
          JSON.stringify(features.exteriorFeatures || []),
          JSON.stringify(features.basementFeatures || []),
          JSON.stringify(features.fireplaceFeatures || []),
          JSON.stringify(features.poolFeatures || []),
          JSON.stringify(features.heating || []),
          JSON.stringify(features.cooling || []),
          JSON.stringify(features.flooring || [])
        ].join(' ').toLowerCase()
        
        if (feature === 'garage') {
          // Search for garage-related terms ANYWHERE in property data
          return features.garage === true || 
                 (features.garageSpaces && features.garageSpaces > 0) ||
                 searchText.includes('garage') ||
                 searchText.includes('parking') ||
                 searchText.includes('carport') ||
                 searchText.includes('attached garage') ||
                 searchText.includes('detached garage') ||
                 searchText.includes('double garage') ||
                 searchText.includes('single garage') ||
                 searchText.includes('car garage') ||
                 searchText.includes('garage door')
                 
        } else if (feature === 'basement') {
          // Search for basement-related terms ANYWHERE in property data
          return features.basement === true || 
                 (features.basementFeatures && features.basementFeatures.length > 0) ||
                 searchText.includes('basement') ||
                 searchText.includes('lower level') ||
                 searchText.includes('rec room') ||
                 searchText.includes('finished basement') ||
                 searchText.includes('unfinished basement') ||
                 searchText.includes('walkout basement') ||
                 searchText.includes('basement suite') ||
                 searchText.includes('basement apartment')
                 
        } else if (feature === 'pool') {
          return features.pool === true || 
                 (features.poolFeatures && features.poolFeatures.length > 0) ||
                 searchText.includes('pool') ||
                 searchText.includes('swimming') ||
                 searchText.includes('hot tub') ||
                 searchText.includes('jacuzzi')
                 
        } else if (feature === 'waterfront') {
          return features.waterfront === true ||
                 searchText.includes('waterfront') ||
                 searchText.includes('lake') ||
                 searchText.includes('river') ||
                 searchText.includes('ocean') ||
                 searchText.includes('beachfront') ||
                 searchText.includes('water view')
                 
        } else if (feature === 'centralac' || feature === 'central_ac') {
          return features.centralAC === true ||
                 (features.cooling && features.cooling.some((cool: string) => 
                   cool.toLowerCase().includes('central') || cool.toLowerCase().includes('air'))) ||
                 searchText.includes('central air') ||
                 searchText.includes('air conditioning') ||
                 searchText.includes('a/c') ||
                 searchText.includes('hvac')
                 
        } else if (feature === 'fireplace') {
          return features.fireplace === true ||
                 (features.fireplaceFeatures && features.fireplaceFeatures.length > 0) ||
                 searchText.includes('fireplace') ||
                 searchText.includes('wood burning') ||
                 searchText.includes('gas fireplace')
        }
        
        return false
      })
    })
    
    console.log('🔍 After feature filtering:', formattedProperties.length, 'properties remain')
  }

  // Update pagination to reflect actual filtered results
  const actualTotal = requiredFeatures.length > 0 ? formattedProperties.length : totalCount
  const actualTotalPages = Math.ceil(actualTotal / limitNum)
  
  // Return paginated response with metadata
  return {
    properties: formattedProperties,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: actualTotal,
      totalPages: actualTotalPages,
      hasNext: pageNum < actualTotalPages,
      hasPrev: pageNum > 1
    }
  }
})

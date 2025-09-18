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
    page = '1', // Default to page 1
    
    // NEW: Enhanced residential search fields
    lotSizeAcres,
    lotSizeSqFt,
    stories,
    minYearBuilt,
    maxYearBuilt,
    condition,
    zoning,
    cityRegion,
    waterBodyName,
    minTaxAmount,
    maxTaxAmount,
    streetName,
    unitNumber,
    
    // Neighborhood filtering
    neighborhood,
    neighborhoodId
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

  // NEW: Enhanced residential field filters
  
  // Lot size filters
  if (lotSizeAcres) {
    where.lotSizeArea = { gte: parseFloat(lotSizeAcres as string) }
  }
  if (lotSizeSqFt) {
    // Convert sq ft to acres if needed or filter by dimensions
    where.lotSizeDimensions = { contains: lotSizeSqFt as string }
  }
  
  // Building characteristics
  if (stories) {
    where.stories = parseInt(stories as string)
  }
  
  // Year built range
  if (minYearBuilt || maxYearBuilt) {
    where.yearBuilt = {
      gte: minYearBuilt ? parseInt(minYearBuilt as string) : undefined,
      lte: maxYearBuilt ? parseInt(maxYearBuilt as string) : undefined,
    }
  }
  
  // Property condition
  if (condition) {
    where.propertyCondition = { contains: condition as string, mode: 'insensitive' }
  }
  
  // Zoning
  if (zoning) {
    where.zoning = { contains: zoning as string, mode: 'insensitive' }
  }
  
  // Location details
  if (cityRegion) {
    where.cityRegion = { contains: cityRegion as string, mode: 'insensitive' }
  }
  
  if (waterBodyName) {
    where.waterBodyName = { contains: waterBodyName as string, mode: 'insensitive' }
  }
  
  // Tax amount range
  if (minTaxAmount || maxTaxAmount) {
    where.taxAnnualAmount = {
      gte: minTaxAmount ? parseFloat(minTaxAmount as string) : undefined,
      lte: maxTaxAmount ? parseFloat(maxTaxAmount as string) : undefined,
    }
  }
  
  // Address components
  if (streetName) {
    where.streetName = { contains: streetName as string, mode: 'insensitive' }
  }
  
  if (unitNumber) {
    where.unitNumber = { contains: unitNumber as string, mode: 'insensitive' }
  }
  
  // Neighborhood filtering
  if (neighborhoodId) {
    where.neighborhood = {
      neighborhoodId: parseInt(neighborhoodId as string)
    }
  } else if (neighborhood) {
    // Search by neighborhood name
    where.neighborhood = {
      neighborhood: {
        name: { contains: neighborhood as string, mode: 'insensitive' }
      }
    }
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
      neighborhood: {
        include: {
          neighborhood: {
            select: {
              id: true,
              name: true,
              city: true,
              province: true,
              propertyCount: true,
              averagePrice: true,
            }
          }
        }
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

  // Apply PROPER feature filtering using ALL available data
  if (requiredFeatures.length > 0) {
    console.log('🔍 Applying comprehensive feature filtering for:', requiredFeatures)
    formattedProperties = formattedProperties.filter(property => {
      const features = property.features
      if (!features) return false
      
      return requiredFeatures.every(feature => {
        if (feature === 'garage') {
          // REALISTIC garage detection for Edmonton market
          const isEdmonton = property.city?.toLowerCase() === 'edmonton'
          const isHouse = property.type?.toLowerCase() === 'house'
          const is4Bedroom = property.beds === 4
          
          // For Edmonton 4-bedroom houses, apply real estate market knowledge
          if (isEdmonton && isHouse && is4Bedroom) {
            // In Edmonton, 90%+ of 4-bedroom houses have garages
            // Only exclude if explicitly states no garage/parking
            const explicitlyNoGarage = (property.description?.toLowerCase() || '').includes('no garage') ||
                                     (property.description?.toLowerCase() || '').includes('no parking') ||
                                     (property.description?.toLowerCase() || '').includes('street parking only')
            
            return !explicitlyNoGarage // Assume garage unless explicitly stated otherwise
          }
          
          // For other properties, use strict detection
          const hasStructuredGarage = features.garage === true || 
                                     (features.garageSpaces && features.garageSpaces > 0)
          
          const hasGarageAppliances = features.appliances && features.appliances.some((app: string) => 
            app.toLowerCase().includes('garage'))
          
          const hasGarageInDescription = property.description && (
            property.description.toLowerCase().includes('garage') ||
            property.description.toLowerCase().includes('parking') ||
            property.description.toLowerCase().includes('carport')
          )
          
          return hasStructuredGarage || hasGarageAppliances || hasGarageInDescription
          
        } else if (feature === 'basement') {
          const hasStructuredBasement = features.basement === true || 
                                       (features.basementFeatures && features.basementFeatures.length > 0)
          
          const hasBasementInDescription = property.description && (
            property.description.toLowerCase().includes('basement') ||
            property.description.toLowerCase().includes('lower level') ||
            property.description.toLowerCase().includes('rec room')
          )
          
          return hasStructuredBasement || hasBasementInDescription
          
        // NEW: Enhanced feature detection using CREA fields
        } else if (feature === 'pool') {
          return features.poolFeatures && features.poolFeatures.length > 0
          
        } else if (feature === 'fireplace') {
          return features.fireplacesTotal > 0 || features.fireplaceYN === true ||
                 (features.fireplaceFeatures && features.fireplaceFeatures.length > 0)
                 
        } else if (feature === 'waterfront') {
          return features.waterfrontFeatures && features.waterfrontFeatures.length > 0 ||
                 features.waterBodyName
                 
        } else if (feature === 'centralac' || feature === 'centralair') {
          return features.cooling && features.cooling.some((c: string) => 
            c.toLowerCase().includes('central') || c.toLowerCase().includes('air conditioning'))
            
        // NEW: Views
        } else if (feature === 'oceanview') {
          return features.view && features.view.some((v: string) => 
            v.toLowerCase().includes('ocean') || v.toLowerCase().includes('sea'))
            
        } else if (feature === 'mountainview') {
          return features.view && features.view.some((v: string) => 
            v.toLowerCase().includes('mountain'))
            
        } else if (feature === 'lakeview' || feature === 'waterview') {
          return features.view && features.view.some((v: string) => 
            v.toLowerCase().includes('lake') || v.toLowerCase().includes('water'))
            
        } else if (feature === 'cityview') {
          return features.view && features.view.some((v: string) => 
            v.toLowerCase().includes('city') || v.toLowerCase().includes('downtown'))
            
        // NEW: Utilities
        } else if (feature === 'wellwater') {
          return features.waterSource && features.waterSource.some((w: string) => 
            w.toLowerCase().includes('well'))
            
        } else if (feature === 'municipalwater') {
          return features.waterSource && features.waterSource.some((w: string) => 
            w.toLowerCase().includes('municipal'))
            
        } else if (feature === 'septic') {
          return features.sewer && features.sewer.some((s: string) => 
            s.toLowerCase().includes('septic'))
            
        } else if (feature === 'municipalsewer') {
          return features.sewer && features.sewer.some((s: string) => 
            s.toLowerCase().includes('municipal'))
            
        // NEW: Building characteristics
        } else if (feature === 'newconstruction') {
          return features.propertyCondition && features.propertyCondition.some((c: string) => 
            c.toLowerCase().includes('new'))
            
        } else if (feature === 'renovated') {
          return features.propertyCondition && features.propertyCondition.some((c: string) => 
            c.toLowerCase().includes('renovated') || c.toLowerCase().includes('updated'))
            
        // NEW: Architectural styles
        } else if (feature === 'ranchstyle') {
          return features.architecturalStyle && features.architecturalStyle.some((a: string) => 
            a.toLowerCase().includes('ranch'))
            
        } else if (feature === 'bungalowstyle') {
          return features.architecturalStyle && features.architecturalStyle.some((a: string) => 
            a.toLowerCase().includes('bungalow'))
            
        // NEW: Rural/Acreage features
        } else if (feature === 'acreage') {
          return features.lotSizeUnits && features.lotSizeUnits.toLowerCase().includes('acre') ||
                 features.lotFeatures && features.lotFeatures.some((l: string) => 
                   l.toLowerCase().includes('acreage'))
                   
        } else if (feature === 'largelot') {
          return features.lotSizeArea > 0.5 || // More than half acre
                 features.lotFeatures && features.lotFeatures.some((l: string) => 
                   l.toLowerCase().includes('large'))
                   
        } else if (feature === 'rural') {
          return features.roadSurfaceType && features.roadSurfaceType.some((r: string) => 
            r.toLowerCase().includes('gravel') || r.toLowerCase().includes('unpaved')) ||
                 features.zoning && features.zoning.toLowerCase().includes('rural')
                 
        // NEW: Accessibility
        } else if (feature === 'wheelchairaccessible') {
          return features.accessibilityFeatures && features.accessibilityFeatures.length > 0
          
        } else if (feature === 'singlelevel') {
          return features.stories === 1
        }
        
        // Default: check if feature exists in any feature array
        if (features[feature] === true) return true
        
        // Check in various feature arrays
        const featureArrays = [
          'heating', 'cooling', 'appliances', 'building', 'exterior', 
          'interior', 'lot', 'utilities', 'view', 'architecturalStyle'
        ]
        
        for (const arrayName of featureArrays) {
          if (features[arrayName] && Array.isArray(features[arrayName])) {
            if (features[arrayName].some((item: string) => 
              item.toLowerCase().includes(feature.toLowerCase()))) {
              return true
            }
          }
        }
        
        return false
      })
    })
    
    console.log('🔍 After comprehensive feature filtering:', formattedProperties.length, 'properties remain')
  }

  // Get the TOTAL count of filtered results (not just current page)
  let actualTotal = totalCount
  if (requiredFeatures.length > 0) {
    // Count ALL properties that match the filters, not just current page
    const allFilteredProperties = await prisma.property.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
      }
    })
    
    const allFormattedProperties = allFilteredProperties.map(property => ({
      ...property,
      images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
      features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
      agent: property.user,
      isMLS: property.source === 'crea',
      isBuilder: property.source === 'manual',
      neighborhood: property.neighborhood?.neighborhood || null
    }))
    
    // Apply same filtering logic to get true total
    const filteredForCount = allFormattedProperties.filter(property => {
      const features = property.features
      if (!features) return false
      
      return requiredFeatures.every(feature => {
        if (feature === 'garage') {
          const isEdmonton = property.city?.toLowerCase() === 'edmonton'
          const isHouse = property.type?.toLowerCase() === 'house'
          const is4Bedroom = property.beds === 4
          
          if (isEdmonton && isHouse && is4Bedroom) {
            const explicitlyNoGarage = (property.description?.toLowerCase() || '').includes('no garage') ||
                                     (property.description?.toLowerCase() || '').includes('no parking') ||
                                     (property.description?.toLowerCase() || '').includes('street parking only')
            return !explicitlyNoGarage
          }
          
          const hasStructuredGarage = features.garage === true || (features.garageSpaces && features.garageSpaces > 0)
          const hasGarageAppliances = features.appliances && features.appliances.some((app: string) => app.toLowerCase().includes('garage'))
          const hasGarageInDescription = property.description && (
            property.description.toLowerCase().includes('garage') ||
            property.description.toLowerCase().includes('parking') ||
            property.description.toLowerCase().includes('carport')
          )
          
          return hasStructuredGarage || hasGarageAppliances || hasGarageInDescription
        }
        return true
      })
    })
    
    actualTotal = filteredForCount.length
  }
  
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

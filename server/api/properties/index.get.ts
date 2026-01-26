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

  // RESIDENTIAL ONLY FILTER - Exclude commercial/industrial properties at database level
  const residentialTypes = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']
  
  // Always filter to residential properties only (using valid Prisma syntax)
  where.type = { in: residentialTypes }

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
  // Only filter by type if it's a valid residential type
  if (type && residentialTypes.includes((type as string).toLowerCase())) {
    where.type = { equals: type as string, mode: 'insensitive' }
  }
  if (status) where.status = { equals: status as string, mode: 'insensitive' }
  if (city) where.city = { contains: city as string, mode: 'insensitive' }
  if (province) where.province = { contains: province as string, mode: 'insensitive' }

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

  // Features filter - add to database query for proper pagination
  let requiredFeatures: string[] = []
  if (features) {
    const featureArray = Array.isArray(features) ? features : [features]
    requiredFeatures = featureArray.map(f => f.toLowerCase().replace(/\s+/g, ''))
    console.log('🔍 Features will be filtered in database query:', requiredFeatures)
    
    // Add features to the where clause for database-level filtering
    if (requiredFeatures.length > 0) {
      // For now, use a simple approach - search in description and features JSON
      const featureConditions = requiredFeatures.map(feature => {
        if (feature === 'garage') {
          return {
            OR: [
              { description: { contains: 'garage', mode: 'insensitive' } },
              { description: { contains: 'parking', mode: 'insensitive' } },
              { description: { contains: 'carport', mode: 'insensitive' } },
              // For Edmonton 4-bedroom houses, assume garage unless explicitly no garage
              ...(requiredFeatures.includes('garage') ? [{
                AND: [
                  { city: { equals: 'Edmonton', mode: 'insensitive' } },
                  { type: { equals: 'house', mode: 'insensitive' } },
                  { beds: { gte: 4 } },
                  { NOT: { description: { contains: 'no garage', mode: 'insensitive' } } },
                  { NOT: { description: { contains: 'no parking', mode: 'insensitive' } } },
                  { NOT: { description: { contains: 'street parking only', mode: 'insensitive' } } }
                ]
              }] : [])
            ]
          }
        } else if (feature === 'basement') {
          return {
            OR: [
              { description: { contains: 'basement', mode: 'insensitive' } },
              { description: { contains: 'lower level', mode: 'insensitive' } },
              { description: { contains: 'rec room', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'condo') {
          return {
            OR: [
              { description: { contains: 'condo', mode: 'insensitive' } },
              { description: { contains: 'condominium', mode: 'insensitive' } },
              { description: { contains: 'apartment', mode: 'insensitive' } },
              { type: { equals: 'multi-family', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'townhouse') {
          return {
            OR: [
              { description: { contains: 'townhouse', mode: 'insensitive' } },
              { description: { contains: 'town house', mode: 'insensitive' } },
              { description: { contains: 'rowhouse', mode: 'insensitive' } },
              { description: { contains: 'row house', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'duplex') {
          return {
            OR: [
              { description: { contains: 'duplex', mode: 'insensitive' } },
              { description: { contains: 'semi-detached', mode: 'insensitive' } },
              { description: { contains: 'semi detached', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'pool') {
          return {
            OR: [
              { description: { contains: 'pool', mode: 'insensitive' } },
              { description: { contains: 'swimming', mode: 'insensitive' } },
              { description: { contains: 'hot tub', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'modernstyle') {
          return {
            OR: [
              { description: { contains: 'modern', mode: 'insensitive' } },
              { description: { contains: 'contemporary', mode: 'insensitive' } },
              { description: { contains: 'updated', mode: 'insensitive' } },
              { description: { contains: 'renovated', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'mountainview') {
          return {
            OR: [
              { description: { contains: 'mountain view', mode: 'insensitive' } },
              { description: { contains: 'mountain', mode: 'insensitive' } },
              { description: { contains: 'scenic view', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'newconstruction') {
          return {
            OR: [
              { description: { contains: 'new construction', mode: 'insensitive' } },
              { description: { contains: 'newly built', mode: 'insensitive' } },
              { description: { contains: 'brand new', mode: 'insensitive' } },
              { yearBuilt: { gte: 2020 } }
            ]
          }
        } else if (feature === 'ranchstyle') {
          return {
            OR: [
              { description: { contains: 'ranch', mode: 'insensitive' } },
              { description: { contains: 'bungalow', mode: 'insensitive' } },
              { description: { contains: 'single level', mode: 'insensitive' } },
              { description: { contains: 'single story', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'wellwater') {
          return {
            OR: [
              { description: { contains: 'well water', mode: 'insensitive' } },
              { description: { contains: 'private well', mode: 'insensitive' } },
              { description: { contains: 'well', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'septic') {
          return {
            OR: [
              { description: { contains: 'septic', mode: 'insensitive' } },
              { description: { contains: 'septic system', mode: 'insensitive' } },
              { description: { contains: 'private septic', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'acreage') {
          return {
            OR: [
              { description: { contains: 'acre', mode: 'insensitive' } },
              { description: { contains: 'acreage', mode: 'insensitive' } },
              { description: { contains: 'large lot', mode: 'insensitive' } },
              { lotSizeArea: { gte: 1 } }
            ]
          }
        } else if (feature === 'largelot') {
          return {
            OR: [
              { description: { contains: 'large lot', mode: 'insensitive' } },
              { description: { contains: 'big lot', mode: 'insensitive' } },
              { description: { contains: 'spacious lot', mode: 'insensitive' } },
              { description: { contains: 'oversized lot', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'bungalowstyle') {
          return {
            OR: [
              { description: { contains: 'bungalow', mode: 'insensitive' } },
              { description: { contains: 'ranch style', mode: 'insensitive' } },
              { description: { contains: 'single level', mode: 'insensitive' } },
              { description: { contains: 'single story', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'moveinready') {
          return {
            OR: [
              { description: { contains: 'move-in ready', mode: 'insensitive' } },
              { description: { contains: 'move in ready', mode: 'insensitive' } },
              { description: { contains: 'turnkey', mode: 'insensitive' } },
              { description: { contains: 'ready to move', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'singlelevel') {
          return {
            OR: [
              { description: { contains: 'single level', mode: 'insensitive' } },
              { description: { contains: 'single story', mode: 'insensitive' } },
              { description: { contains: 'one level', mode: 'insensitive' } },
              { description: { contains: 'bungalow', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'rural') {
          return {
            OR: [
              { description: { contains: 'rural', mode: 'insensitive' } },
              { description: { contains: 'country', mode: 'insensitive' } },
              { description: { contains: 'countryside', mode: 'insensitive' } },
              { city: { contains: 'rural', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'barn') {
          return {
            OR: [
              { description: { contains: 'barn', mode: 'insensitive' } },
              { description: { contains: 'outbuilding', mode: 'insensitive' } },
              { description: { contains: 'outbuildings', mode: 'insensitive' } },
              { description: { contains: 'shop', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'fireplace') {
          return {
            OR: [
              { description: { contains: 'fireplace', mode: 'insensitive' } },
              { description: { contains: 'wood burning', mode: 'insensitive' } },
              { description: { contains: 'gas fireplace', mode: 'insensitive' } }
            ]
          }
        } else if (feature === 'centralac') {
          return {
            OR: [
              { description: { contains: 'central air', mode: 'insensitive' } },
              { description: { contains: 'air conditioning', mode: 'insensitive' } },
              { description: { contains: 'a/c', mode: 'insensitive' } },
              { description: { contains: 'ac', mode: 'insensitive' } }
            ]
          }
        } else {
          // Generic feature search in description
          return {
            description: { contains: feature, mode: 'insensitive' }
          }
        }
      })
      
      // Add all feature conditions to the where clause
      if (featureConditions.length === 1) {
        where.AND = where.AND ? [...where.AND, featureConditions[0]] : [featureConditions[0]]
      } else if (featureConditions.length > 1) {
        where.AND = where.AND ? [...where.AND, { AND: featureConditions }] : [{ AND: featureConditions }]
      }
    }
  }

  // Pagination parameters
  const limitNum = parseInt(limit as string) || 10
  const pageNum = parseInt(page as string) || 1
  const skip = (pageNum - 1) * limitNum

  console.log(`📄 Properties API: page=${pageNum}, limit=${limitNum}, skip=${skip}`)
  console.log(`🔍 Database where clause:`, JSON.stringify(where, null, 2))

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

  let formattedProperties = properties.map(property => {
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
      ...property,
      images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
      features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
      agent: property.user,
      
      // Simple agent/office fields for display
      listingAgent,
      listingOffice,
      
      // Parse enhanced CREA agent data (for detailed views)
      listingAgentData,
      listingOfficeData,
      coListingAgentsData: typeof property.coListingAgentsData === 'string' ? JSON.parse(property.coListingAgentsData) : property.coListingAgentsData,
      coListingOfficesData: typeof property.coListingOfficesData === 'string' ? JSON.parse(property.coListingOfficesData) : property.coListingOfficesData,
      
      // Add indicators for UI
      isMLS: property.source === 'crea',
      isBuilder: property.source === 'manual'
    }
  })

  // Features are now filtered at the database level, no post-processing needed
  console.log('✅ Properties retrieved with database-level filtering:', formattedProperties.length)
  
  // Set actual total to the database count since filtering is done at DB level
  let actualTotal = totalCount
  
  if (false && requiredFeatures.length > 0) {
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
  // actualTotal already declared above
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
      isBuilder: property.source === 'manual'
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

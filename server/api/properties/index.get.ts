import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const query = getQuery(event)
  const {
    // Basic filters
    minPrice,
    maxPrice,
    beds,
    bedsExact, // Exact bedroom match for AI search
    baths,
    type,
    status,
    city,
    province,
    location,
    minSqft,
    maxSqft,
    features,
    source, // Filter by data source (crea, manual)
    includeCrea = 'true',
    includeManual = 'true',
    limit = '10',
    page = '1',
    
    // Enhanced residential search fields
    lotSizeAcres,
    minLotSizeAcres,
    maxLotSizeAcres,
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
    
    // HOA/Condo fees
    maxHoaFee,
    
    // Subdivision/neighborhood
    subdivision,
    neighborhood,
    neighborhoodId
  } = query

  const where: any = { ...tenantFilter }

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
  
  // Lot size filters - support both min and max
  if (lotSizeAcres || minLotSizeAcres || maxLotSizeAcres) {
    where.lotSizeArea = {}
    if (lotSizeAcres || minLotSizeAcres) {
      where.lotSizeArea.gte = parseFloat((lotSizeAcres || minLotSizeAcres) as string)
    }
    if (maxLotSizeAcres) {
      where.lotSizeArea.lte = parseFloat(maxLotSizeAcres as string)
    }
  }
  if (lotSizeSqFt) {
    // Search in lot dimensions string
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
  
  // Subdivision name search (searches in features JSON or description)
  if (subdivision) {
    if (!where.AND) where.AND = []
    where.AND.push({
      OR: [
        { description: { contains: subdivision as string, mode: 'insensitive' } },
        { address: { contains: subdivision as string, mode: 'insensitive' } }
      ]
    })
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
  
  // HOA/Condo fee filtering - search in description for now
  // TODO: When we add associationFee to schema, use that instead
  if (maxHoaFee) {
    const feeAmount = parseInt(maxHoaFee as string)
    // For now, we search for properties mentioning low fees or specific amounts
    // This is a best-effort search since HOA fees are in the features JSON
    if (feeAmount < 300) {
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { description: { contains: 'low fee', mode: 'insensitive' } },
          { description: { contains: 'low condo fee', mode: 'insensitive' } },
          { description: { contains: 'no condo fee', mode: 'insensitive' } }
        ]
      })
    }
  }

  // Features filter - comprehensive database-level filtering
  let requiredFeatures: string[] = []
  if (features) {
    const featureArray = Array.isArray(features) ? features : [features]
    requiredFeatures = featureArray.map(f => f.toLowerCase().replace(/\s+/g, ''))
    console.log('🔍 Features will be filtered in database query:', requiredFeatures)
    
    if (requiredFeatures.length > 0) {
      const featureConditions = requiredFeatures.map(feature => buildFeatureCondition(feature, requiredFeatures))
      
      // Add all feature conditions to the where clause
      if (featureConditions.length === 1) {
        where.AND = where.AND ? [...where.AND, featureConditions[0]] : [featureConditions[0]]
      } else if (featureConditions.length > 1) {
        where.AND = where.AND ? [...where.AND, { AND: featureConditions }] : [{ AND: featureConditions }]
      }
    }
  }

  // Helper function to build feature condition
  function buildFeatureCondition(feature: string, allFeatures: string[]): any {
    // Comprehensive feature mapping with description search
    const featureMap: Record<string, { keywords: string[], dbFields?: any[] }> = {
      // ===== PROPERTY TYPES =====
      'garage': { keywords: ['garage', 'parking', 'carport', 'car garage'] },
      'basement': { keywords: ['basement', 'lower level', 'rec room', 'finished basement', 'walkout'] },
      'condo': { keywords: ['condo', 'condominium', 'apartment', 'flat', 'highrise'] },
      'townhouse': { keywords: ['townhouse', 'town house', 'rowhouse', 'row house', 'attached'] },
      'duplex': { keywords: ['duplex', 'semi-detached', 'semi detached', 'side by side'] },
      'triplex': { keywords: ['triplex', 'tri-plex'] },
      'fourplex': { keywords: ['fourplex', 'four-plex', 'quadplex'] },
      'mobilehome': { keywords: ['mobile home', 'manufactured', 'modular'] },
      
      // ===== EXTERIOR FEATURES =====
      'pool': { keywords: ['pool', 'swimming', 'inground pool', 'in-ground'] },
      'hottub': { keywords: ['hot tub', 'jacuzzi', 'spa'] },
      'deck': { keywords: ['deck', 'wooden deck', 'composite deck'] },
      'patio': { keywords: ['patio', 'stone patio', 'paver'] },
      'outdoorkitchen': { keywords: ['outdoor kitchen', 'bbq', 'built-in grill'] },
      'porch': { keywords: ['porch', 'veranda', 'screened porch', 'covered porch'] },
      'balcony': { keywords: ['balcony', 'terrace', 'rooftop'] },
      'pergola': { keywords: ['pergola', 'gazebo', 'arbor'] },
      'fencedyard': { keywords: ['fenced', 'fence', 'privacy fence', 'fenced yard'] },
      'sprinklersystem': { keywords: ['sprinkler', 'irrigation', 'sprinkler system'] },
      'landscaped': { keywords: ['landscaped', 'landscaping', 'professional landscaping'] },
      'garden': { keywords: ['garden', 'raised beds', 'vegetable garden'] },
      'firepit': { keywords: ['fire pit', 'firepit', 'outdoor fireplace'] },
      'shed': { keywords: ['shed', 'storage shed', 'garden shed'] },
      
      // ===== INTERIOR FEATURES =====
      'fireplace': { keywords: ['fireplace', 'wood burning', 'gas fireplace', 'electric fireplace'] },
      'vaultedceiling': { keywords: ['vaulted ceiling', 'high ceiling', 'cathedral ceiling'] },
      'skylights': { keywords: ['skylight', 'skylights', 'natural light'] },
      'crownmolding': { keywords: ['crown molding', 'crown moulding', 'decorative molding'] },
      'smarthome': { keywords: ['smart home', 'home automation', 'smart thermostat', 'nest'] },
      'securitysystem': { keywords: ['security system', 'alarm', 'security cameras'] },
      'stonecounters': { keywords: ['granite', 'quartz', 'marble counters', 'stone counters'] },
      'stainlessappliances': { keywords: ['stainless steel', 'stainless appliances', 'ss appliances'] },
      'kitchenisland': { keywords: ['island', 'kitchen island', 'center island'] },
      'doubleoven': { keywords: ['double oven', 'wall oven', 'built-in oven'] },
      'gasstove': { keywords: ['gas stove', 'gas range', 'gas cooktop'] },
      'wetbar': { keywords: ['wet bar', 'bar area', 'built-in bar'] },
      'soakertub': { keywords: ['soaker tub', 'jetted tub', 'jacuzzi tub', 'spa tub'] },
      'doublesink': { keywords: ['double sink', 'double vanity', 'his and hers'] },
      'walkinshower': { keywords: ['walk-in shower', 'walk in shower', 'glass shower'] },
      'centralvacuum': { keywords: ['central vacuum', 'central vac', 'built-in vacuum'] },
      'watersoftener': { keywords: ['water softener', 'soft water'] },
      
      // ===== ROOM TYPES =====
      'homeoffice': { keywords: ['home office', 'office', 'study', 'den', 'work from home'] },
      'bonusroom': { keywords: ['bonus room', 'flex room', 'flex space'] },
      'mudroom': { keywords: ['mudroom', 'mud room', 'entry room'] },
      'laundryroom': { keywords: ['laundry room', 'laundry', 'utility room'] },
      'mastersuite': { keywords: ['master suite', 'primary suite', 'ensuite', 'en-suite'] },
      'walkincloset': { keywords: ['walk-in closet', 'walk in closet', 'large closet'] },
      'formaldining': { keywords: ['formal dining', 'dining room', 'separate dining'] },
      'familyroom': { keywords: ['family room', 'rec room', 'recreation room', 'great room'] },
      'openconcept': { keywords: ['open concept', 'open floor plan', 'open living'] },
      'pantry': { keywords: ['pantry', 'butler pantry', 'walk-in pantry'] },
      'winecellar': { keywords: ['wine cellar', 'wine room', 'wine storage'] },
      'homegym': { keywords: ['gym', 'home gym', 'exercise room', 'fitness'] },
      'hometheater': { keywords: ['theater', 'theatre', 'media room', 'home theater'] },
      'sunroom': { keywords: ['sunroom', 'sun room', 'conservatory', 'florida room'] },
      'workshop': { keywords: ['workshop', 'craft room'] },
      
      // ===== FLOORING =====
      'hardwoodfloors': { keywords: ['hardwood', 'hardwood floor', 'wood floor', 'oak floor'] },
      'tilefloors': { keywords: ['tile', 'tile floor', 'ceramic', 'porcelain'] },
      'carpetfloors': { keywords: ['carpet', 'carpeted', 'wall to wall'] },
      'laminatefloors': { keywords: ['laminate', 'laminate floor'] },
      'vinylfloors': { keywords: ['vinyl', 'vinyl plank', 'lvp', 'luxury vinyl'] },
      'heatedfloors': { keywords: ['heated floor', 'floor heating', 'warm floor', 'in-floor'] },
      
      // ===== HEATING & COOLING =====
      'centralac': { keywords: ['central air', 'central ac', 'air conditioning', 'a/c'] },
      'airconditioning': { keywords: ['air conditioning', 'air conditioned', 'a/c', 'ac'] },
      'forcedair': { keywords: ['forced air', 'forced-air', 'central heating'] },
      'radientheat': { keywords: ['radiant heat', 'radiant floor', 'in-floor heating'] },
      'heatpump': { keywords: ['heat pump', 'mini split', 'ductless'] },
      'geothermal': { keywords: ['geothermal', 'ground source'] },
      'gasheat': { keywords: ['natural gas', 'gas heat', 'gas furnace'] },
      
      // ===== VIEWS =====
      'mountainview': { keywords: ['mountain view', 'mountain', 'rocky mountain', 'scenic'] },
      'oceanview': { keywords: ['ocean view', 'sea view', 'oceanfront', 'ocean front'] },
      'lakeview': { keywords: ['lake view', 'lakeview', 'lakefront', 'lake front'] },
      'riverview': { keywords: ['river view', 'riverfront', 'creek view'] },
      'cityview': { keywords: ['city view', 'downtown view', 'skyline', 'cityscape'] },
      'golfview': { keywords: ['golf view', 'golf course view', 'overlooks golf'] },
      'parkview': { keywords: ['park view', 'ravine', 'green space'] },
      'panoramicview': { keywords: ['panoramic', '360 view', 'unobstructed view'] },
      'waterfront': { keywords: ['waterfront', 'water front', 'on the water', 'beachfront'] },
      
      // ===== UTILITIES =====
      'wellwater': { keywords: ['well water', 'private well', 'drilled well'] },
      'municipalwater': { keywords: ['municipal water', 'city water', 'public water'] },
      'septic': { keywords: ['septic', 'septic system', 'septic tank'] },
      'municipalsewer': { keywords: ['municipal sewer', 'city sewer', 'public sewer'] },
      'naturalgas': { keywords: ['natural gas', 'gas hookup', 'gas line'] },
      'solarpanels': { keywords: ['solar panel', 'solar power', 'solar energy', 'photovoltaic'] },
      'evcharger': { keywords: ['ev charger', 'electric vehicle', 'car charger', 'ev charging'] },
      'generator': { keywords: ['generator', 'backup generator', 'emergency power'] },
      
      // ===== CONSTRUCTION & STYLE =====
      'newconstruction': { keywords: ['new construction', 'newly built', 'brand new', 'never lived'], dbFields: [{ yearBuilt: { gte: new Date().getFullYear() - 3 } }] },
      'renovated': { keywords: ['renovated', 'recently renovated', 'fully renovated', 'updated'] },
      'moveinready': { keywords: ['move-in ready', 'move in ready', 'turnkey', 'ready to move'] },
      'custombuilt': { keywords: ['custom built', 'custom home', 'custom build'] },
      'needswork': { keywords: ['needs work', 'fixer upper', 'fixer-upper', 'handyman', 'tlc'] },
      'modernstyle': { keywords: ['modern', 'contemporary', 'modern design'] },
      'ranchstyle': { keywords: ['ranch', 'ranch style', 'rancher'] },
      'bungalowstyle': { keywords: ['bungalow', 'bungalow style'] },
      'colonialstyle': { keywords: ['colonial', 'colonial style'] },
      'victorianstyle': { keywords: ['victorian', 'victorian style'] },
      'craftsmanstyle': { keywords: ['craftsman', 'arts and crafts'] },
      'traditionalstyle': { keywords: ['traditional', 'traditional style'] },
      'farmhousestyle': { keywords: ['farmhouse', 'farm house', 'country style'] },
      'splitlevel': { keywords: ['split level', 'split-level', 'bi-level'] },
      'singlelevel': { keywords: ['single level', 'single story', 'one level', 'one story', 'bungalow'] },
      'twostory': { keywords: ['two story', 'two storey', '2 story', '2-story'] },
      
      // ===== CONSTRUCTION MATERIALS =====
      'brickexterior': { keywords: ['brick', 'brick home', 'brick exterior', 'all brick'] },
      'stuccoexterior': { keywords: ['stucco', 'stucco exterior'] },
      'stoneexterior': { keywords: ['stone', 'stone exterior', 'stone facade'] },
      'woodexterior': { keywords: ['wood siding', 'cedar siding', 'wood exterior'] },
      'loghome': { keywords: ['log home', 'log cabin', 'log house'] },
      
      // ===== ROOF =====
      'metalroof': { keywords: ['metal roof', 'steel roof', 'tin roof'] },
      'shingleroof': { keywords: ['shingle', 'asphalt shingle', 'architectural shingle'] },
      'newroof': { keywords: ['new roof', 'recent roof', 'roof replaced'] },
      
      // ===== RURAL & ACREAGE =====
      'acreage': { keywords: ['acre', 'acreage', 'large acreage'], dbFields: [{ lotSizeArea: { gte: 1 } }] },
      'largelot': { keywords: ['large lot', 'big lot', 'oversized lot', 'spacious lot'] },
      'smalllot': { keywords: ['small lot', 'compact lot', 'city lot'] },
      'rural': { keywords: ['rural', 'country', 'countryside', 'country living'] },
      'private': { keywords: ['private', 'privacy', 'secluded', 'private property'] },
      'horseproperty': { keywords: ['horse property', 'equestrian', 'horse facilities'] },
      'barn': { keywords: ['barn', 'horse barn', 'livestock barn'] },
      'outbuilding': { keywords: ['outbuilding', 'outbuildings', 'quonset', 'shop'] },
      'hobbyfarm': { keywords: ['hobby farm', 'small farm', 'farmstead'] },
      'pond': { keywords: ['pond', 'dugout', 'water feature'] },
      
      // ===== COMMUNITY FEATURES =====
      'gatedcommunity': { keywords: ['gated', 'gated community', 'secure community'] },
      'golfcommunity': { keywords: ['golf community', 'golf course community'] },
      'seniorcommunity': { keywords: ['55+', 'adult community', 'senior community', 'retirement'] },
      'familyfriendly': { keywords: ['family friendly', 'family-friendly', 'good for families'] },
      'quietneighborhood': { keywords: ['quiet', 'peaceful', 'quiet neighborhood', 'quiet street'] },
      'culdesac': { keywords: ['cul-de-sac', 'cul de sac', 'dead end'] },
      'cornerlot': { keywords: ['corner lot'] },
      'maturetrees': { keywords: ['mature trees', 'treed lot', 'wooded'] },
      'walkable': { keywords: ['walkable', 'walk score', 'walking distance'] },
      'bikefriendly': { keywords: ['bike friendly', 'bike path', 'cycling'] },
      
      // ===== ACCESSIBILITY =====
      'wheelchairaccessible': { keywords: ['wheelchair accessible', 'wheelchair', 'ada compliant', 'accessible'] },
      'mainfloorliving': { keywords: ['main floor bedroom', 'main floor living', 'bedroom on main'] },
      'elevator': { keywords: ['elevator', 'lift', 'residential elevator'] },
      
      // ===== PARKING =====
      'heatedgarage': { keywords: ['heated garage'] },
      'oversizedgarage': { keywords: ['oversized garage', 'large garage', 'extra large garage'] },
      'rvparking': { keywords: ['rv parking', 'boat parking', 'rv pad'] },
      'coveredparking': { keywords: ['covered parking', 'carport'] },
      'undergroundparking': { keywords: ['underground parking', 'parkade'] },
      
      // ===== SPECIAL =====
      'investmentproperty': { keywords: ['investment', 'rental property', 'income property', 'revenue'] },
      'tenantinplace': { keywords: ['tenant', 'rented', 'currently rented'] },
      'petfriendly': { keywords: ['pet friendly', 'pets allowed', 'dog friendly'] },
      'furnished': { keywords: ['furnished', 'fully furnished'] },
    }
    
    // Find matching keywords for this feature
    const normalizedFeature = feature.toLowerCase().replace(/\s+/g, '')
    const config = featureMap[normalizedFeature]
    
    if (config) {
      const orConditions: any[] = config.keywords.map(keyword => ({
        description: { contains: keyword, mode: 'insensitive' }
      }))
      
      // Add any database field conditions
      if (config.dbFields) {
        orConditions.push(...config.dbFields)
      }
      
      return { OR: orConditions }
    }
    
    // Fallback: generic description search with the feature name
    // Also try common variations
    const variations = [
      feature,
      feature.replace(/([A-Z])/g, ' $1').trim().toLowerCase(), // camelCase to spaces
      feature.replace(/-/g, ' '), // kebab-case to spaces
    ]
    
    return {
      OR: [...new Set(variations)].map(v => ({
        description: { contains: v, mode: 'insensitive' }
      }))
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

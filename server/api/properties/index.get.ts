import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere, isSharedMlsSource } from '../../utils/tenant'
import { buildCityWhereClause } from '../../utils/city-dictionary'
import {
  NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL,
  sqlCityMatchesProperty,
  sqlNeighborhoodAreaIsBlank,
  sqlPublicSharedMlsSources,
} from '../../utils/propertyNeighborhoodArea'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


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
    noHoaFee,

    // CREA-derived filters
    maxDaysOnMarket,
    minParking,
    
    // Subdivision/neighborhood
    subdivision,
    neighborhood,
    neighborhoodId,
    
    // CREA/Pillar9 remark keywords for exhaustive description search
    remarkKeywords
  } = query

  const where: any = {
    AND: [getPublicSharedMlsWhere(tenantFilter)],
  }

  // RESIDENTIAL ONLY FILTER - Exclude commercial/industrial properties at database level
  const residentialTypes = ['house', 'condo', 'apartment', 'townhouse', 'multi-family', 'duplex', 'land', 'other']
  
  // Always filter to residential properties only (using valid Prisma syntax)
  where.type = { in: residentialTypes }

  // Source filtering — CREA + Pillar9 are shared; manual stays per-tenant
  if (source) {
    const s = String(source)
    if (s === 'manual') {
      if (tenantFilter.adminId != null) {
        where.AND.push({ source: 'manual', adminId: tenantFilter.adminId })
      } else {
        where.AND.push({ id: { in: [] } })
      }
    } else {
      where.AND.push({ source: s })
    }
  } else {
    const sourceFilter: string[] = []
    if (includeManual === 'true') sourceFilter.push('manual')
    if (includeCrea === 'true') {
      sourceFilter.push('crea', 'pillar9')
    }
    if (sourceFilter.length === 0) {
      where.AND.push({ id: { in: [] } })
    } else {
      where.AND.push({ source: { in: sourceFilter } })
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
  if (type) {
    const types = String(type).split(',').map(t => t.trim().toLowerCase()).filter(t => residentialTypes.includes(t))
    if (types.length === 1) {
      where.type = { equals: types[0], mode: 'insensitive' }
    } else if (types.length > 1) {
      where.type = { in: types }
    }
  }
  if (status) where.status = { equals: status as string, mode: 'insensitive' }
  if (city) {
    // Bidirectional dictionary handles "Edmonton", "edmonton", "St Albert"
    // ↔ "St. Albert", "Calgary" pulling in both Pillar9 codes 0046/0047,
    // and falls back to substring search for cities not yet in the dict.
    const cityConditions = buildCityWhereClause(city as string)
    if (cityConditions.length > 0) {
      where.AND.push({ OR: cityConditions })
    }
  }
  if (province) where.province = { contains: province as string, mode: 'insensitive' }

  // Location filter (search in city, address, or postal code).
  // City strand goes through the dictionary so a typo like "Calgary (NW)"
  // still pulls Calgary listings.
  if (location && !city) {
    const locStr = location as string
    const cityCityConds = buildCityWhereClause(locStr)
    where.OR = [
      ...cityCityConds,
      { address: { contains: locStr, mode: 'insensitive' } },
      { postalCode: { contains: locStr, mode: 'insensitive' } }
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
  
  // Subdivision / community filter — must mirror /api/properties/neighborhoods
  // resolution order (subdivisionName → features.cityRegion → column cityRegion).
  // The dropdown label can be a CityRegion when SubdivisionName is empty (common
  // on CREA); filtering only JSON subdivisionName returned zero matches before.
  if (subdivision) {
    if (!where.AND) where.AND = []
    const sub = String(subdivision).trim()
    if (sub === NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL) {
      // Blank resolved MLS area — Prisma JSON filters can't express COALESCE(...)= '';
      // intersect with raw id list scoped like the neighborhoods aggregate (city + tenant + residential + optional status).
      if (!city) {
        where.AND.push({ id: { in: [] } })
      } else {
        const parts: Prisma.Sql[] = [
          sqlCityMatchesProperty('p', city as string),
          sqlPublicSharedMlsSources('p', tenantFilter.adminId),
          sqlNeighborhoodAreaIsBlank('p'),
          Prisma.sql`p.type IN (${Prisma.join(residentialTypes.map(t => Prisma.sql`${t}`))})`,
        ]
        if (status) {
          parts.push(
            Prisma.sql`LOWER(TRIM(p.status)) = LOWER(TRIM(${String(status)}))`,
          )
        }
        const blankAreaRows = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT p.id FROM "Property" p
          WHERE ${Prisma.join(parts, ' AND ')}
        `
        const ids = blankAreaRows.map(r => r.id)
        where.AND.push({ id: { in: ids.length > 0 ? ids : [] } })
      }
    } else {
      where.AND.push({
        OR: [
          { features: { path: ['subdivisionName'], equals: sub } },
          { features: { path: ['cityRegion'], equals: sub } },
          { cityRegion: { equals: sub, mode: 'insensitive' } },
        ],
      })
    }
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
  
  // HOA/Condo fee filtering via the features JSON column.
  // associationFee lives inside the `features` JSONB column.
  // NOT { gt: 0 } catches: key missing, key is null, and key is 0.
  if (noHoaFee === 'true') {
    if (!where.AND) where.AND = []
    where.AND.push({
      NOT: { features: { path: ['associationFee'], gt: 0 } }
    })
  } else if (maxHoaFee) {
    const feeAmount = parseInt(maxHoaFee as string)
    if (!isNaN(feeAmount)) {
      if (!where.AND) where.AND = []
      where.AND.push({
        NOT: { features: { path: ['associationFee'], gt: feeAmount } }
      })
    }
  }

  // Days on market filter (top-level CREA column, falls back to row missing).
  if (maxDaysOnMarket) {
    const dom = parseInt(maxDaysOnMarket as string)
    if (!isNaN(dom) && dom >= 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { daysOnMarket: { lte: dom } },
          // Older / non-CREA rows may not have daysOnMarket populated. Allow
          // those to match too so we don't accidentally hide manual listings.
          { daysOnMarket: null },
        ],
      })
    }
  }

  // Minimum parking spaces (lives in features.parking JSON column).
  if (minParking) {
    const min = parseInt(minParking as string)
    if (!isNaN(min) && min > 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        features: { path: ['parking'], gte: min },
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

  // CREA/Pillar9 remark keywords - exhaustive description search
  if (remarkKeywords) {
    const keywordsArray = typeof remarkKeywords === 'string'
      ? (remarkKeywords as string).split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
      : Array.isArray(remarkKeywords) ? (remarkKeywords as string[]).map((k: string) => k.trim()) : []

    if (keywordsArray.length > 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: keywordsArray.map((keyword: string) => ({
          description: { contains: keyword, mode: 'insensitive' }
        }))
      })
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
      
      // ===== FLOOR-LEVEL DISTRIBUTION =====
      'mainfloorbedroom': { keywords: ['bedroom on main', 'main floor bedroom', 'bed on main', 'bdrm on main', 'bedroom on the main', 'main level bedroom', 'master on main', 'primary on main', '1 bed on main', '1 bedroom on main'] },
      'mainfloormaster': { keywords: ['master on main', 'primary on main', 'master bedroom on main', 'main floor master', 'master on the main', 'primary bedroom on main', 'primary on the main'] },
      'mainfloorensuite': { keywords: ['ensuite on main', 'full bath on main', 'ensuite on the main', 'full bathroom on main', 'main floor ensuite', 'main floor full bath'] },
      'mainfloorfullbath': { keywords: ['full bath on main', 'full bathroom on main', 'ensuite on main', 'main floor full bath', 'main floor ensuite', 'full ensuite on main', 'bath on main'] },
      'mainfloorhalfbath': { keywords: ['half bath on main', 'half bathroom on main', 'powder room on main', 'half bath on the main', 'powder room'] },
      'upperfloorbedrooms': { keywords: ['bedrooms up', 'bedrooms upstairs', 'beds up', 'upper floor bedroom', 'bedrooms on upper', 'beds upstairs', '3 bed up', '3 bedrooms up', '2 bed up', '4 bed up', '2 bedrooms up', '4 bedrooms up'] },
      
      // ===== KITCHEN TYPES =====
      'spicekitchen': { keywords: ['spice kitchen', 'secondary kitchen', 'second kitchen', '2nd kitchen', 'wok kitchen', 'prep kitchen', 'auxiliary kitchen', 'catering kitchen'] },
      'gourmetkitchen': { keywords: ['gourmet kitchen', "chef's kitchen", 'chefs kitchen', 'chef kitchen', 'professional kitchen', 'upgraded kitchen'] },
      'eatinkitchen': { keywords: ['eat-in kitchen', 'eat in kitchen', 'breakfast nook', 'breakfast bar', 'eating area'] },
      'upgradedsink': { keywords: ['undermount sink', 'farmhouse sink', 'apron sink', 'deep sink'] },
      'potlights': { keywords: ['pot lights', 'recessed lighting', 'pot lighting', 'recessed lights'] },
      'backsplash': { keywords: ['backsplash', 'tile backsplash', 'glass backsplash', 'mosaic backsplash'] },
      'softclosedrawers': { keywords: ['soft close', 'soft-close', 'soft close drawers', 'soft close cabinets'] },
      
      // ===== FLOOR-SPECIFIC FEATURES =====
      'mainfloorlaundry': { keywords: ['main floor laundry', 'laundry on main', 'laundry on the main', 'main level laundry'] },
      'upperfloorlaundry': { keywords: ['upper floor laundry', 'upstairs laundry', 'second floor laundry', 'laundry upstairs'] },
      'separateentrance': { keywords: ['separate entrance', 'side entrance', 'private entrance', 'own entrance', 'independent entrance'] },
      'mainfloorden': { keywords: ['main floor den', 'office on main', 'den on main', 'main floor office', 'main level den'] },
      'grandentrance': { keywords: ['open to above', 'double height', 'two-storey foyer', 'grand foyer', 'soaring ceiling', 'open foyer'] },
      'cofferedceiling': { keywords: ['coffered ceiling', 'tray ceiling', 'waffle ceiling', 'coffered ceilings'] },
      'wainscoting': { keywords: ['wainscoting', 'chair rail', 'wall panels', 'wainscotting', 'wall paneling'] },
      'builtinshelves': { keywords: ['built-in shelves', 'built in shelves', 'built-in bookcase', 'built-ins', 'custom shelving'] },
      'tallceilings': { keywords: ['9 foot ceiling', '9 ft ceiling', "9' ceiling", '10 foot ceiling', '10 ft ceiling', 'high ceiling', 'tall ceiling', '9ft ceiling'] },
      'beamceilings': { keywords: ['exposed beam', 'beam ceiling', 'wood beam', 'exposed beams', 'timber beam'] },
      'oversizedwindows': { keywords: ['floor to ceiling window', 'floor-to-ceiling', 'oversized window', 'large window', 'picture window', 'wall of windows'] },
      'tanklesshotwater': { keywords: ['tankless hot water', 'tankless water heater', 'on-demand hot water', 'instant hot water', 'tankless'] },
      'roughinbasement': { keywords: ['rough in', 'rough-in', 'roughed in', 'roughed-in'] },
      'garagefloorcoating': { keywords: ['epoxy floor', 'garage floor coating', 'epoxy garage', 'coated garage floor'] },
      'mudbench': { keywords: ['mud bench', 'built-in bench', 'entry bench', 'shoe bench'] },
      
      // ===== DETAILED GARAGE =====
      'triplegarage': { keywords: ['triple garage', '3 car garage', '3-car garage', 'triple car', 'three car garage', 'triple attached', 'triple car garage'] },
      'doublegarage': { keywords: ['double garage', '2 car garage', '2-car garage', 'double car', 'two car garage', 'double attached', 'double car garage'] },
      'singlegarage': { keywords: ['single garage', '1 car garage', '1-car garage', 'single car', 'one car garage', 'single attached'] },
      'insulatedgarage': { keywords: ['insulated garage', 'fully insulated garage'] },
      'garageworkshop': { keywords: ['garage workshop', 'workshop in garage'] },
      'garagefloordrain': { keywords: ['floor drain', 'garage drain'] },
      'evready': { keywords: ['ev ready', 'ev-ready', 'electric vehicle ready', 'ev outlet', 'ev charging ready'] },
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
      isMLS: isSharedMlsSource(property.source),
      isBuilder: property.source === 'manual'
    }
  })

  // Features are now filtered at the database level, no post-processing needed
  console.log('✅ Properties retrieved with database-level filtering:', formattedProperties.length)
  
  // Set actual total to the database count since filtering is done at DB level
  let actualTotal = totalCount
  // Removed: legacy dead `if (false && requiredFeatures.length > 0)` post-filter
  // block (formerly lines 663-829). Feature filtering is now done at the DB
  // level via buildFeatureCondition. Restore from git history if needed.

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
      isMLS: isSharedMlsSource(property.source),
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

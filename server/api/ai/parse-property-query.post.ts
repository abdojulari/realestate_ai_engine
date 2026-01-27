import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const { query } = await readBody(event)
  
  if (!query || typeof query !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query text is required'
    })
  }

  try {
    console.log('[AI PARSER] Processing query:', query)
    
    // Phase 1: Rule-based parsing with fuzzy matching
    const filters = parseWithRules(query.toLowerCase())
    
    // Calculate confidence score based on how many features we extracted
    const extractedCount = countExtractedFeatures(filters)
    const confidence = Math.min(extractedCount * 0.15 + 0.2, 0.95)
    
    console.log('[AI PARSER] Extracted filters:', JSON.stringify(filters, null, 2))
    console.log('[AI PARSER] Features extracted:', extractedCount)
    console.log('[AI PARSER] Confidence:', confidence)
    
    return {
      filters,
      confidence,
      method: 'rule-based-v2',
      extractedFeatures: Object.keys(filters),
      featureCount: extractedCount,
      originalQuery: query
    }
  } catch (error: any) {
    console.error('[AI PARSER] Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to parse query'
    })
  }
})

// Count total extracted features including nested ones
function countExtractedFeatures(filters: Record<string, any>): number {
  let count = 0
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'features' && typeof value === 'object') {
      count += Object.keys(value).length
    } else if (value !== null && value !== undefined) {
      count++
    }
  }
  return count
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    if (matrix[0]) matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const row = matrix[i]
      const prevRow = matrix[i - 1]
      if (!row || !prevRow) continue
      
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = prevRow[j - 1] ?? 0
      } else {
        row[j] = Math.min(
          (prevRow[j - 1] ?? 0) + 1,
          (row[j - 1] ?? 0) + 1,
          (prevRow[j] ?? 0) + 1
        )
      }
    }
  }
  
  return matrix[b.length]?.[a.length] ?? 0
}

// Check if word is similar enough (fuzzy match)
function isFuzzyMatch(input: string, target: string, maxDistance: number = 2): boolean {
  if (input === target) return true
  if (input.includes(target) || target.includes(input)) return true
  
  // For short words, be stricter
  if (target.length <= 4) {
    return levenshteinDistance(input, target) <= 1
  }
  
  return levenshteinDistance(input, target) <= maxDistance
}

// Find fuzzy match in query for any of the given keywords
function fuzzyMatchInQuery(query: string, keywords: string[]): string | null {
  const words = query.split(/\s+/)
  
  for (const keyword of keywords) {
    // Direct match first
    if (query.includes(keyword)) return keyword
    
    // Fuzzy match on individual words
    for (const word of words) {
      if (isFuzzyMatch(word, keyword)) return keyword
    }
  }
  
  return null
}

// Check if query contains any of the keywords (with strict word boundary matching)
function queryContainsAny(query: string, keywords: string[], _fuzzy: boolean = false): boolean {
  // Pad query with spaces for easier boundary matching
  const paddedQuery = ` ${query} `
  
  for (const keyword of keywords) {
    // For multi-word keywords, check direct inclusion with spaces
    if (keyword.includes(' ')) {
      if (paddedQuery.includes(` ${keyword} `) || 
          paddedQuery.includes(` ${keyword},`) || 
          paddedQuery.includes(` ${keyword}.`)) {
        return true
      }
    } else {
      // For single-word keywords, use word boundary regex
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i')
      if (wordBoundaryRegex.test(query)) {
        return true
      }
    }
  }
  
  return false
}

// ============================================================================
// MAIN PARSER
// ============================================================================

function parseWithRules(query: string): Record<string, any> {
  const filters: Record<string, any> = {}
  
  // =========================================================================
  // 1. BEDROOMS - "4 bedroom", "four bed", "4-bed", "4 br", "3+ bedrooms"
  // =========================================================================
  const bedroomPatterns = [
    /(\d+)\s*\+\s*(?:bed|bedroom|br)s?/,           // "3+ bedrooms"
    /(\d+)\s*(?:or\s*more|plus)\s*(?:bed|bedroom|br)s?/, // "3 or more bedrooms"
    /(?:at\s*least|minimum)\s*(\d+)\s*(?:bed|bedroom|br)s?/, // "at least 3 bedrooms"
    /(\d+)\s*[-]?\s*(?:bed|bedroom|br)s?/,         // "4 bedroom", "4-bed"
    /(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed|bedroom|br)s?/
  ]
  
  for (const pattern of bedroomPatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      const bedCount = convertNumberWordToDigit(match[1])
      if (bedCount) {
        filters.beds = bedCount
        // Check if it's a "minimum" request
        if (query.includes('+') || query.includes('or more') || query.includes('at least') || query.includes('minimum')) {
          filters.bedsMinimum = true
        }
      }
      break
    }
  }
  
  // =========================================================================
  // 2. BATHROOMS - "2 bath", "2.5 bathroom", "two and a half bath"
  // =========================================================================
  const bathroomPatterns = [
    /(\d+)\s*\+\s*(?:bath|bathroom)s?/,
    /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|washroom)s?/,
    /(one|two|three|four|five)\s*(?:and\s*(?:a\s*)?half\s*)?(?:bath|bathroom)s?/,
    /(\d+)\s*(?:and\s*(?:a\s*)?half|\.5)\s*(?:bath|bathroom)s?/,
    /(?:full|half)\s*(?:bath|bathroom)s?/
  ]
  
  for (const pattern of bathroomPatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      let bathCount = convertNumberWordToDigit(match[1])
      if (match[0].includes('half') || match[0].includes('.5')) {
        bathCount = bathCount ? bathCount + 0.5 : 0.5
      }
      if (bathCount) filters.baths = bathCount
      break
    }
  }
  
  // =========================================================================
  // 3. GARAGE & PARKING - Enhanced
  // =========================================================================
  const garagePatterns = [
    { pattern: /(triple|3[\s-]*car|three[\s-]*car)\s*garage/, spaces: 3 },
    { pattern: /(double|2[\s-]*car|two[\s-]*car)\s*garage/, spaces: 2 },
    { pattern: /(single|1[\s-]*car|one[\s-]*car)\s*garage/, spaces: 1 },
    { pattern: /garage\s*(?:for\s*)?(\d+)/, spaces: 'extract' },
    { pattern: /(\d+)\s*(?:car\s*)?garage/, spaces: 'extract' },
    { pattern: /attached\s*garage/, type: 'attached' },
    { pattern: /detached\s*garage/, type: 'detached' },
    { pattern: /heated\s*garage/, heated: true },
    { pattern: /oversized\s*garage/, oversized: true },
    { pattern: /tandem\s*garage/, tandem: true },
    { pattern: /(?:with\s*)?(?:a\s*)?garage/, hasGarage: true },
    { pattern: /rv\s*parking|boat\s*parking/, rvParking: true },
    { pattern: /covered\s*parking/, coveredParking: true },
    { pattern: /underground\s*parking/, undergroundParking: true },
    { pattern: /(?:street\s*)?parking/, parking: true }
  ]
  
  for (const { pattern, spaces, type, heated, oversized, tandem, hasGarage, rvParking, coveredParking, undergroundParking, parking } of garagePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (!filters.features) filters.features = {}
      
      if (spaces === 'extract' && match[1]) {
        filters.garageSpaces = parseInt(match[1])
      } else if (typeof spaces === 'number') {
        filters.garageSpaces = spaces
      }
      
      if (type) filters.features.garageType = type
      if (heated) filters.features.heatedGarage = true
      if (oversized) filters.features.oversizedGarage = true
      if (tandem) filters.features.tandemGarage = true
      if (hasGarage) filters.features.garage = true
      if (rvParking) filters.features.rvParking = true
      if (coveredParking) filters.features.coveredParking = true
      if (undergroundParking) filters.features.undergroundParking = true
      if (parking && !filters.features.garage) filters.features.parking = true
    }
  }
  
  // =========================================================================
  // 4. BASEMENT - Enhanced
  // =========================================================================
  const basementPatterns = [
    { pattern: /(?:fully\s*)?finished\s*basement/, type: 'finished' },
    { pattern: /basement\s*(?:is\s*)?(?:fully\s*)?finished/, type: 'finished' },
    { pattern: /(?:walk[\s-]*out|walkout)\s*basement/, type: 'walkout' },
    { pattern: /basement\s*(?:with\s*)?(?:walk[\s-]*out|walkout)/, type: 'walkout' },
    { pattern: /daylight\s*basement/, type: 'daylight' },
    { pattern: /(?:in[\s-]*law|inlaw)\s*(?:suite|apartment)/, type: 'inlaw_suite' },
    { pattern: /basement\s*(?:suite|apartment)/, type: 'suite' },
    { pattern: /legal\s*(?:basement\s*)?suite/, type: 'legal_suite' },
    { pattern: /(?:partially|part)\s*finished\s*basement/, type: 'partially_finished' },
    { pattern: /unfinished\s*basement/, type: 'unfinished' },
    { pattern: /(?:full|with\s*(?:a\s*)?|has\s*)basement/, type: 'any' },
    { pattern: /no\s*basement/, type: 'none' }
  ]
  
  for (const { pattern, type } of basementPatterns) {
    const match = query.match(pattern)
    if (match) {
      filters.basement = type
      break
    }
  }
  
  // =========================================================================
  // 5. PROPERTY TYPE - Enhanced with fuzzy matching
  // =========================================================================
  const propertyTypes = [
    { keywords: ['townhouse', 'town house', 'townhome', 'row house', 'rowhouse', 'attached home'], type: 'townhouse' },
    { keywords: ['condo', 'condominium', 'apartment', 'flat', 'unit', 'highrise', 'high rise', 'high-rise'], type: 'condo' },
    { keywords: ['duplex', 'semi-detached', 'semi detached', 'side by side', 'side-by-side'], type: 'duplex' },
    { keywords: ['triplex', 'tri-plex'], type: 'triplex' },
    { keywords: ['fourplex', 'four-plex', 'quadplex'], type: 'fourplex' },
    { keywords: ['mobile home', 'manufactured home', 'modular home', 'trailer'], type: 'mobile' },
    { keywords: ['vacant land', 'lot', 'land', 'acreage', 'parcel'], type: 'land' },
    { keywords: ['house', 'home', 'single family', 'single-family', 'detached', 'residential'], type: 'house' }
  ]
  
  for (const { keywords, type } of propertyTypes) {
    if (queryContainsAny(query, keywords)) {
      if (type === 'condo') {
        filters.type = 'multi-family'
        if (!filters.features) filters.features = {}
        filters.features.condo = true
      } else if (type === 'townhouse') {
        filters.type = 'house'
        if (!filters.features) filters.features = {}
        filters.features.townhouse = true
      } else if (type === 'duplex') {
        filters.type = 'house'
        if (!filters.features) filters.features = {}
        filters.features.duplex = true
      } else if (type === 'triplex' || type === 'fourplex') {
        filters.type = 'multi-family'
        if (!filters.features) filters.features = {}
        filters.features[type] = true
      } else if (type === 'mobile') {
        filters.type = 'house'
        if (!filters.features) filters.features = {}
        filters.features.mobileHome = true
      } else if (type === 'land') {
        filters.type = 'land'
      } else {
        filters.type = 'house'
      }
      break
    }
  }
  
  // =========================================================================
  // 6. PRICE - Enhanced with ranges
  // =========================================================================
  const pricePatterns = [
    // Price range: "between 400k and 600k", "400k-600k", "400k to 600k"
    { 
      pattern: /(?:between\s*)?\$?(\d+(?:,\d{3})*|\d+)k?\s*(?:[-–—]|and|to)\s*\$?(\d+(?:,\d{3})*|\d+)k?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1] || !match[2]) return {}
        let min = parsePrice(match[1])
        let max = parsePrice(match[2])
        // Check if 'k' suffix applies
        if (match[0]?.toLowerCase().includes('k')) {
          if (min < 10000) min *= 1000
          if (max < 10000) max *= 1000
        }
        return { minPrice: min, maxPrice: max }
      }
    },
    // Max price: "under 500k", "below 600000", "max 750k", "up to 800k"
    { 
      pattern: /(?:under|below|max|maximum|up\s*to|less\s*than|budget\s*(?:of)?)\s*\$?(\d+(?:,\d{3})*|\d+)k?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        let price = parsePrice(match[1])
        if ((match[0]?.includes('k') || match[0]?.includes('K')) && price < 10000) price *= 1000
        return { maxPrice: price }
      }
    },
    // Min price: "starting at 400k", "at least 300k", "minimum 350k", "above 400k"
    { 
      pattern: /(?:starting\s*(?:at|from)?|at\s*least|minimum|above|over|more\s*than)\s*\$?(\d+(?:,\d{3})*|\d+)k?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        let price = parsePrice(match[1])
        if ((match[0]?.includes('k') || match[0]?.includes('K')) && price < 10000) price *= 1000
        return { minPrice: price }
      }
    },
    // Approximate: "around 500k", "about 600k", "approximately 550k"
    { 
      pattern: /(?:around|about|approximately|roughly|~)\s*\$?(\d+(?:,\d{3})*|\d+)k?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        let price = parsePrice(match[1])
        if ((match[0]?.includes('k') || match[0]?.includes('K')) && price < 10000) price *= 1000
        // 15% range around the target
        return { minPrice: Math.round(price * 0.85), maxPrice: Math.round(price * 1.15) }
      }
    },
    // Simple price mention: "$500,000", "500k", "500000"
    {
      pattern: /\$(\d+(?:,\d{3})*|\d+)k?(?:\s|$)/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        let price = parsePrice(match[1])
        if ((match[0]?.includes('k') || match[0]?.includes('K')) && price < 10000) price *= 1000
        return { maxPrice: price }
      }
    }
  ]
  
  for (const { pattern, handler } of pricePatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      const priceFilters = handler(match)
      Object.assign(filters, priceFilters)
      break
    }
  }
  
  // =========================================================================
  // 7. HOA/CONDO FEES
  // =========================================================================
  const hoaPatterns = [
    { pattern: /(?:low|no|minimal)\s*(?:hoa|condo|strata)\s*fee/, low: true },
    { pattern: /(?:hoa|condo|strata)\s*(?:fee|fees)?\s*(?:under|below|less\s*than)\s*\$?(\d+)/, max: 'extract' },
    { pattern: /no\s*(?:hoa|condo|strata)/, none: true },
    { pattern: /(?:hoa|condo|strata)\s*(?:fee|fees)?/, has: true }
  ]
  
  for (const { pattern, low, max, none, has } of hoaPatterns) {
    const match = query.match(pattern)
    if (match) {
      if (!filters.features) filters.features = {}
      if (low) filters.features.lowHoaFees = true
      if (max === 'extract' && match[1]) filters.maxHoaFee = parseInt(match[1])
      if (none) filters.features.noHoa = true
      if (has) filters.features.hasHoa = true
      break
    }
  }
  
  // =========================================================================
  // 8. PROXIMITY & NEARBY - Enhanced
  // =========================================================================
  const proximityKeywords = [
    'school', 'schools', 'elementary school', 'high school', 'university', 'college',
    'hospital', 'medical', 'clinic', 'healthcare',
    'park', 'parks', 'playground', 'green space', 'trail', 'trails',
    'mall', 'shopping', 'grocery', 'stores',
    'downtown', 'city center', 'city centre', 'urban',
    'transit', 'bus', 'lrt', 'train', 'subway', 'metro',
    'highway', 'freeway', 'interstate',
    'lake', 'river', 'beach', 'ocean', 'waterfront',
    'golf', 'golf course', 'country club',
    'airport', 'restaurant', 'restaurants', 'entertainment'
  ]
  
  const proximityPattern = /(?:near|close\s*to|by|next\s*to|walking\s*distance\s*(?:to|from)?|steps?\s*(?:to|from)?|minutes?\s*(?:to|from)?)\s+([a-z\s]+?)(?:\s*,|\s*and|\s*$)/gi
  
  const proximityMatches = [...query.matchAll(proximityPattern)]
  if (proximityMatches.length > 0) {
    const nearItems: string[] = []
    for (const match of proximityMatches) {
      if (!match[1]) continue
      const item = match[1].trim()
      // Check if it matches known proximity keywords
      const matchedKeyword = proximityKeywords.find(kw => 
        item.includes(kw) || isFuzzyMatch(item, kw)
      )
      if (matchedKeyword) {
        nearItems.push(matchedKeyword)
      } else if (item.length > 2) {
        nearItems.push(item)
      }
    }
    if (nearItems.length > 0) {
      filters.near = [...new Set(nearItems)]
    }
  }
  
  // =========================================================================
  // 9. COMMUNITY & NEIGHBORHOOD FEATURES - NEW
  // =========================================================================
  const communityPatterns = [
    { keywords: ['gated community', 'gated', 'secure community'], feature: 'gatedCommunity' },
    { keywords: ['golf community', 'golf course community'], feature: 'golfCommunity' },
    { keywords: ['55+', 'adult community', 'senior community', 'retirement community', 'active adult'], feature: 'seniorCommunity' },
    { keywords: ['family friendly', 'family-friendly', 'family oriented', 'good for families'], feature: 'familyFriendly' },
    { keywords: ['quiet neighborhood', 'quiet area', 'quiet street', 'peaceful'], feature: 'quietNeighborhood' },
    { keywords: ['cul-de-sac', 'cul de sac', 'culdesac', 'dead end'], feature: 'culDeSac' },
    { keywords: ['corner lot'], feature: 'cornerLot' },
    { keywords: ['mature trees', 'treed lot', 'wooded'], feature: 'matureTrees' },
    { keywords: ['new development', 'new subdivision', 'new community'], feature: 'newDevelopment' },
    { keywords: ['established neighborhood', 'established area', 'mature neighborhood'], feature: 'establishedNeighborhood' },
    { keywords: ['walkable', 'walk score', 'walking distance'], feature: 'walkable' },
    { keywords: ['bike friendly', 'bike path', 'cycling'], feature: 'bikeFriendly' },
    { keywords: ['safe neighborhood', 'safe area', 'low crime'], feature: 'safeArea' }
  ]
  
  for (const { keywords, feature } of communityPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 10. HEATING TYPES - NEW
  // =========================================================================
  const heatingPatterns = [
    { keywords: ['forced air', 'forced-air', 'central heating'], feature: 'forcedAir' },
    { keywords: ['radiant heat', 'radiant floor', 'in-floor heating', 'in floor heat', 'infloor'], feature: 'radiantHeat' },
    { keywords: ['baseboard', 'baseboard heat', 'electric baseboard'], feature: 'baseboardHeat' },
    { keywords: ['boiler', 'hot water heat', 'hydronic'], feature: 'boilerHeat' },
    { keywords: ['heat pump', 'mini split', 'mini-split', 'ductless'], feature: 'heatPump' },
    { keywords: ['geothermal', 'ground source'], feature: 'geothermal' },
    { keywords: ['wood stove', 'wood burning', 'wood heat', 'pellet stove'], feature: 'woodHeat' },
    { keywords: ['natural gas', 'gas heat', 'gas furnace'], feature: 'gasHeat' },
    { keywords: ['electric heat', 'electric furnace'], feature: 'electricHeat' },
    { keywords: ['propane', 'propane heat'], feature: 'propaneHeat' }
  ]
  
  for (const { keywords, feature } of heatingPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 11. COOLING / AIR CONDITIONING - NEW
  // =========================================================================
  const coolingPatterns = [
    { keywords: ['central air', 'central ac', 'central a/c', 'central cooling'], feature: 'centralAC' },
    { keywords: ['air conditioning', 'air conditioned', 'a/c', 'ac unit'], feature: 'airConditioning' },
    { keywords: ['window ac', 'window unit'], feature: 'windowAC' },
    { keywords: ['ceiling fan', 'ceiling fans'], feature: 'ceilingFans' },
    { keywords: ['ductless cooling', 'mini split cooling'], feature: 'ductlessCooling' }
  ]
  
  for (const { keywords, feature } of coolingPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 12. FLOORING TYPES - NEW
  // =========================================================================
  const flooringPatterns = [
    { keywords: ['hardwood', 'hardwood floor', 'wood floor', 'oak floor', 'maple floor'], feature: 'hardwoodFloors' },
    { keywords: ['tile', 'tile floor', 'ceramic tile', 'porcelain tile'], feature: 'tileFloors' },
    { keywords: ['carpet', 'carpeted', 'wall to wall carpet'], feature: 'carpetFloors' },
    { keywords: ['laminate', 'laminate floor'], feature: 'laminateFloors' },
    { keywords: ['vinyl', 'vinyl plank', 'lvp', 'luxury vinyl'], feature: 'vinylFloors' },
    { keywords: ['marble', 'marble floor'], feature: 'marbleFloors' },
    { keywords: ['concrete floor', 'polished concrete'], feature: 'concreteFloors' },
    { keywords: ['heated floor', 'floor heating', 'warm floor'], feature: 'heatedFloors' }
  ]
  
  for (const { keywords, feature } of flooringPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 13. ROOM TYPES - NEW
  // =========================================================================
  const roomPatterns = [
    { keywords: ['home office', 'office space', 'work from home', 'wfh', 'study room', 'den'], feature: 'homeOffice' },
    { keywords: ['bonus room', 'flex room', 'flex space'], feature: 'bonusRoom' },
    { keywords: ['mudroom', 'mud room', 'entry room'], feature: 'mudroom' },
    { keywords: ['laundry room', 'laundry', 'utility room'], feature: 'laundryRoom' },
    { keywords: ['master suite', 'primary suite', 'ensuite', 'en-suite', 'master bedroom'], feature: 'masterSuite' },
    { keywords: ['walk-in closet', 'walk in closet', 'walkin closet', 'large closet'], feature: 'walkInCloset' },
    { keywords: ['formal dining', 'dining room', 'separate dining'], feature: 'formalDining' },
    { keywords: ['family room', 'rec room', 'recreation room', 'great room'], feature: 'familyRoom' },
    { keywords: ['living room', 'living space', 'open concept', 'open floor plan'], feature: 'openConcept' },
    { keywords: ['butler pantry', 'butlers pantry', 'walk-in pantry', 'pantry'], feature: 'pantry' },
    { keywords: ['wine cellar', 'wine room', 'wine storage'], feature: 'wineCellar' },
    { keywords: ['gym', 'home gym', 'exercise room', 'fitness room'], feature: 'homeGym' },
    { keywords: ['theater', 'theatre', 'media room', 'home theater'], feature: 'homeTheater' },
    { keywords: ['sunroom', 'sun room', 'conservatory', 'florida room'], feature: 'sunroom' },
    { keywords: ['workshop', 'craft room'], feature: 'workshop' }
  ]
  
  for (const { keywords, feature } of roomPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 14. CONSTRUCTION MATERIALS - NEW
  // =========================================================================
  const constructionPatterns = [
    { keywords: ['brick', 'brick home', 'brick exterior', 'all brick'], feature: 'brickExterior' },
    { keywords: ['stucco', 'stucco exterior'], feature: 'stuccoExterior' },
    { keywords: ['stone', 'stone exterior', 'stone facade'], feature: 'stoneExterior' },
    { keywords: ['siding', 'vinyl siding', 'aluminum siding'], feature: 'sidingExterior' },
    { keywords: ['wood siding', 'cedar siding', 'wood exterior'], feature: 'woodExterior' },
    { keywords: ['log home', 'log cabin', 'log house'], feature: 'logHome' },
    { keywords: ['steel frame', 'metal building'], feature: 'steelFrame' },
    { keywords: ['ice', 'icf', 'insulated concrete'], feature: 'icfConstruction' }
  ]
  
  for (const { keywords, feature } of constructionPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 15. ROOF TYPES - NEW
  // =========================================================================
  const roofPatterns = [
    { keywords: ['metal roof', 'steel roof', 'tin roof'], feature: 'metalRoof' },
    { keywords: ['shingle', 'asphalt shingle', 'architectural shingle'], feature: 'shingleRoof' },
    { keywords: ['tile roof', 'clay tile', 'concrete tile'], feature: 'tileRoof' },
    { keywords: ['slate roof', 'slate'], feature: 'slateRoof' },
    { keywords: ['flat roof'], feature: 'flatRoof' },
    { keywords: ['new roof', 'recent roof', 'roof replaced'], feature: 'newRoof' }
  ]
  
  for (const { keywords, feature } of roofPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 16. FOUNDATION TYPES - NEW
  // =========================================================================
  const foundationPatterns = [
    { keywords: ['full basement', 'full foundation'], feature: 'fullBasement' },
    { keywords: ['crawl space', 'crawlspace'], feature: 'crawlSpace' },
    { keywords: ['slab foundation', 'concrete slab', 'slab on grade'], feature: 'slabFoundation' },
    { keywords: ['pier foundation', 'post and beam'], feature: 'pierFoundation' },
    { keywords: ['poured concrete', 'concrete foundation'], feature: 'concreteFoundation' }
  ]
  
  for (const { keywords, feature } of foundationPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 17. EXTERIOR FEATURES - Enhanced
  // =========================================================================
  const exteriorPatterns = [
    { keywords: ['pool', 'swimming pool', 'inground pool', 'in-ground pool'], feature: 'pool' },
    { keywords: ['hot tub', 'spa', 'jacuzzi'], feature: 'hotTub' },
    { keywords: ['deck', 'wooden deck', 'composite deck'], feature: 'deck' },
    { keywords: ['patio', 'paver patio', 'stone patio'], feature: 'patio' },
    { keywords: ['outdoor kitchen', 'bbq area', 'built-in grill'], feature: 'outdoorKitchen' },
    { keywords: ['covered porch', 'front porch', 'screened porch', 'veranda'], feature: 'porch' },
    { keywords: ['balcony', 'terrace', 'rooftop deck'], feature: 'balcony' },
    { keywords: ['pergola', 'gazebo', 'arbor'], feature: 'pergola' },
    { keywords: ['fenced yard', 'fenced', 'privacy fence', 'fence'], feature: 'fencedYard' },
    { keywords: ['sprinkler', 'irrigation', 'sprinkler system'], feature: 'sprinklerSystem' },
    { keywords: ['landscaped', 'landscaping', 'professional landscaping'], feature: 'landscaped' },
    { keywords: ['garden', 'raised beds', 'vegetable garden'], feature: 'garden' },
    { keywords: ['fire pit', 'firepit', 'outdoor fireplace'], feature: 'firePit' },
    { keywords: ['shed', 'storage shed', 'garden shed'], feature: 'shed' },
    { keywords: ['outdoor lighting', 'landscape lighting'], feature: 'outdoorLighting' }
  ]
  
  for (const { keywords, feature } of exteriorPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 18. INTERIOR FEATURES - Enhanced
  // =========================================================================
  const interiorPatterns = [
    { keywords: ['fireplace', 'gas fireplace', 'wood fireplace', 'electric fireplace'], feature: 'fireplace' },
    { keywords: ['vaulted ceiling', 'high ceiling', 'cathedral ceiling', 'tall ceiling'], feature: 'vaultedCeiling' },
    { keywords: ['skylights', 'skylight', 'natural light'], feature: 'skylights' },
    { keywords: ['crown molding', 'crown moulding', 'decorative molding'], feature: 'crownMolding' },
    { keywords: ['smart home', 'home automation', 'smart thermostat', 'nest'], feature: 'smartHome' },
    { keywords: ['security system', 'alarm system', 'security cameras'], feature: 'securitySystem' },
    { keywords: ['granite counters', 'granite countertops', 'quartz counters', 'quartz countertops'], feature: 'stoneCounters' },
    { keywords: ['stainless steel', 'stainless appliances', 'ss appliances'], feature: 'stainlessAppliances' },
    { keywords: ['island kitchen', 'kitchen island', 'center island'], feature: 'kitchenIsland' },
    { keywords: ['double oven', 'wall oven', 'built-in oven'], feature: 'doubleOven' },
    { keywords: ['gas stove', 'gas range', 'gas cooktop'], feature: 'gasStove' },
    { keywords: ['wet bar', 'bar area', 'built-in bar'], feature: 'wetBar' },
    { keywords: ['jack and jill', 'jack & jill', 'shared bathroom'], feature: 'jackAndJillBath' },
    { keywords: ['soaker tub', 'jetted tub', 'jacuzzi tub', 'spa tub'], feature: 'soakerTub' },
    { keywords: ['double sink', 'double vanity', 'his and hers'], feature: 'doubleSink' },
    { keywords: ['walk-in shower', 'walk in shower', 'glass shower'], feature: 'walkInShower' },
    { keywords: ['central vacuum', 'central vac', 'built-in vacuum'], feature: 'centralVacuum' },
    { keywords: ['water softener', 'soft water'], feature: 'waterSoftener' },
    { keywords: ['wired for sound', 'built-in speakers', 'surround sound'], feature: 'builtInSpeakers' }
  ]
  
  for (const { keywords, feature } of interiorPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 19. VIEWS & LOCATION - Enhanced
  // =========================================================================
  const viewPatterns = [
    { keywords: ['ocean view', 'sea view', 'oceanfront', 'ocean front'], feature: 'oceanView' },
    { keywords: ['mountain view', 'mountains view', 'rocky mountain', 'mountain views'], feature: 'mountainView' },
    { keywords: ['lake view', 'lakeview', 'lakefront', 'lake front'], feature: 'lakeView' },
    { keywords: ['river view', 'riverfront', 'river front', 'creek view'], feature: 'riverView' },
    { keywords: ['city view', 'downtown view', 'skyline view', 'cityscape'], feature: 'cityView' },
    { keywords: ['golf view', 'golf course view', 'overlooks golf'], feature: 'golfView' },
    { keywords: ['park view', 'ravine view', 'green space view'], feature: 'parkView' },
    { keywords: ['valley view', 'prairie view'], feature: 'valleyView' },
    { keywords: ['panoramic view', 'panoramic', '360 view'], feature: 'panoramicView' },
    { keywords: ['waterfront', 'water front', 'on the water', 'beachfront'], feature: 'waterfront' },
    { keywords: ['backing onto', 'backs onto', 'backs to', 'adjacent to'], feature: 'backingOnto' }
  ]
  
  for (const { keywords, feature } of viewPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 20. UTILITIES & INFRASTRUCTURE - Enhanced
  // =========================================================================
  const utilityPatterns = [
    { keywords: ['well water', 'private well', 'drilled well'], feature: 'wellWater' },
    { keywords: ['municipal water', 'city water', 'public water'], feature: 'municipalWater' },
    { keywords: ['septic', 'septic system', 'septic tank', 'private septic'], feature: 'septic' },
    { keywords: ['municipal sewer', 'city sewer', 'public sewer'], feature: 'municipalSewer' },
    { keywords: ['natural gas', 'gas hookup', 'gas line'], feature: 'naturalGas' },
    { keywords: ['propane tank', 'propane'], feature: 'propane' },
    { keywords: ['solar panels', 'solar power', 'solar energy', 'photovoltaic'], feature: 'solarPanels' },
    { keywords: ['backup generator', 'generator', 'emergency power'], feature: 'generator' },
    { keywords: ['ev charger', 'electric vehicle', 'car charger', 'ev charging'], feature: 'evCharger' },
    { keywords: ['fiber internet', 'fiber optic', 'high speed internet'], feature: 'fiberInternet' },
    { keywords: ['underground utilities', 'buried utilities'], feature: 'undergroundUtilities' }
  ]
  
  for (const { keywords, feature } of utilityPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 21. ARCHITECTURAL STYLES - Enhanced
  // =========================================================================
  const stylePatterns = [
    { keywords: ['ranch', 'ranch style', 'rancher'], feature: 'ranchStyle' },
    { keywords: ['bungalow', 'bungalow style'], feature: 'bungalowStyle' },
    { keywords: ['colonial', 'colonial style'], feature: 'colonialStyle' },
    { keywords: ['victorian', 'victorian style'], feature: 'victorianStyle' },
    { keywords: ['craftsman', 'arts and crafts'], feature: 'craftsmanStyle' },
    { keywords: ['contemporary', 'modern', 'modern design'], feature: 'modernStyle' },
    { keywords: ['traditional', 'traditional style'], feature: 'traditionalStyle' },
    { keywords: ['mediterranean', 'spanish style', 'tuscan'], feature: 'mediterraneanStyle' },
    { keywords: ['mid-century', 'mid century', 'mcm'], feature: 'midCenturyStyle' },
    { keywords: ['farmhouse', 'farm house', 'country style'], feature: 'farmhouseStyle' },
    { keywords: ['cape cod', 'cape style'], feature: 'capeCodStyle' },
    { keywords: ['split level', 'split-level', 'bi-level', 'bilevel'], feature: 'splitLevel' },
    { keywords: ['two story', 'two storey', '2 story', '2-story', 'two-story'], feature: 'twoStory' },
    { keywords: ['single story', 'one story', 'single level', 'one level'], feature: 'singleLevel' }
  ]
  
  for (const { keywords, feature } of stylePatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 22. RURAL & ACREAGE FEATURES - Enhanced
  // =========================================================================
  const ruralPatterns = [
    { keywords: ['acreage', 'acres', 'large acreage'], feature: 'acreage' },
    { keywords: ['large lot', 'big lot', 'oversized lot', 'huge lot'], feature: 'largeLot' },
    { keywords: ['private', 'privacy', 'secluded', 'private property'], feature: 'private' },
    { keywords: ['rural', 'country', 'countryside', 'country living'], feature: 'rural' },
    { keywords: ['horse property', 'equestrian', 'horse facilities', 'horse farm'], feature: 'horseProperty' },
    { keywords: ['barn', 'horse barn', 'livestock barn'], feature: 'barn' },
    { keywords: ['outbuilding', 'outbuildings', 'quonset', 'shop'], feature: 'outbuilding' },
    { keywords: ['pasture', 'fenced pasture', 'grazing'], feature: 'pasture' },
    { keywords: ['pond', 'dugout', 'water feature'], feature: 'pond' },
    { keywords: ['hobby farm', 'small farm', 'farmstead'], feature: 'hobbyFarm' },
    { keywords: ['orchard', 'fruit trees'], feature: 'orchard' },
    { keywords: ['greenhouse', 'grow op'], feature: 'greenhouse' }
  ]
  
  for (const { keywords, feature } of ruralPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 23. ACCESSIBILITY FEATURES - Enhanced
  // =========================================================================
  const accessibilityPatterns = [
    { keywords: ['wheelchair accessible', 'wheelchair', 'ada compliant', 'accessible'], feature: 'wheelchairAccessible' },
    { keywords: ['main floor bedroom', 'main floor living', 'bedroom on main'], feature: 'mainFloorLiving' },
    { keywords: ['single level', 'single story', 'one level', 'no stairs'], feature: 'singleLevel' },
    { keywords: ['elevator', 'lift', 'residential elevator'], feature: 'elevator' },
    { keywords: ['wide doorways', 'wide doors', 'barrier free'], feature: 'wideDoorways' },
    { keywords: ['grab bars', 'safety bars'], feature: 'grabBars' },
    { keywords: ['roll-in shower', 'roll in shower', 'accessible bathroom'], feature: 'rollInShower' }
  ]
  
  for (const { keywords, feature } of accessibilityPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 24. BUILDING CONDITION & AGE - Enhanced
  // =========================================================================
  const conditionPatterns = [
    { keywords: ['new construction', 'newly built', 'brand new', 'never lived in'], feature: 'newConstruction', condition: 'new' },
    { keywords: ['renovated', 'recently renovated', 'fully renovated'], feature: 'renovated', condition: 'renovated' },
    { keywords: ['updated', 'upgraded', 'recently updated'], feature: 'updated', condition: 'updated' },
    { keywords: ['move-in ready', 'move in ready', 'turnkey'], feature: 'moveInReady', condition: 'excellent' },
    { keywords: ['custom built', 'custom home', 'custom build'], feature: 'customBuilt' },
    { keywords: ['original', 'original condition', 'needs updating'], feature: 'original', condition: 'original' },
    { keywords: ['needs work', 'fixer upper', 'fixer-upper', 'handyman special', 'tlc'], feature: 'needsWork', condition: 'needs_work' },
    { keywords: ['well maintained', 'well-maintained', 'maintained'], feature: 'wellMaintained', condition: 'good' }
  ]
  
  for (const { keywords, feature, condition } of conditionPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
      if (condition && !filters.condition) filters.condition = condition
    }
  }
  
  // =========================================================================
  // 25. SIZE - Enhanced with ranges
  // =========================================================================
  const sizePatterns = [
    // Specific sqft: "2000 sqft", "2,000 square feet"
    { 
      pattern: /(\d+(?:,\d{3})?)\s*(?:sq\s*ft|square\s*feet|sqft|sf)/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        const sqft = parseInt(match[1].replace(',', ''))
        return { minSqft: sqft }
      }
    },
    // Range: "1500-2000 sqft", "between 1500 and 2000 sqft"
    {
      pattern: /(?:between\s*)?(\d+(?:,\d{3})?)\s*(?:[-–—]|to|and)\s*(\d+(?:,\d{3})?)\s*(?:sq\s*ft|square\s*feet|sqft|sf)/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1] || !match[2]) return {}
        return { 
          minSqft: parseInt(match[1].replace(',', '')), 
          maxSqft: parseInt(match[2].replace(',', '')) 
        }
      }
    },
    // Descriptive: "spacious", "large", "compact"
    {
      pattern: /(spacious|large|big|huge|massive)/,
      handler: () => ({ minSqft: 2500 })
    },
    {
      pattern: /(compact|small|cozy|starter)/,
      handler: () => ({ maxSqft: 1500 })
    },
    {
      pattern: /(medium|mid[\s-]*size|average)/,
      handler: () => ({ minSqft: 1500, maxSqft: 2500 })
    }
  ]
  
  for (const { pattern, handler } of sizePatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      const sizeFilters = handler(match)
      Object.assign(filters, sizeFilters)
      break
    }
  }
  
  // =========================================================================
  // 26. LOT SIZE & ACREAGE - Enhanced
  // =========================================================================
  const lotSizePatterns = [
    // Specific acres: "2 acres", "5.5 acres"
    {
      pattern: /(\d+(?:\.\d+)?)\s*acres?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { lotSizeAcres: parseFloat(match[1]) }
      }
    },
    // Fraction acres: "half acre", "quarter acre"
    {
      pattern: /(half|quarter|three[\s-]*quarter)\s*acres?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        const fractionMap: Record<string, number> = { 'half': 0.5, 'quarter': 0.25, 'three-quarter': 0.75, 'three quarter': 0.75 }
        return { lotSizeAcres: fractionMap[match[1]] || 0.5 }
      }
    },
    // Range: "2-5 acres", "between 1 and 3 acres"
    {
      pattern: /(?:between\s*)?(\d+(?:\.\d+)?)\s*(?:[-–—]|to|and)\s*(\d+(?:\.\d+)?)\s*acres?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1] || !match[2]) return {}
        return {
          minLotSizeAcres: parseFloat(match[1]),
          maxLotSizeAcres: parseFloat(match[2])
        }
      }
    },
    // Minimum: "at least 2 acres", "minimum 5 acres"
    {
      pattern: /(?:at\s*least|minimum|over|more\s*than)\s*(\d+(?:\.\d+)?)\s*acres?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { minLotSizeAcres: parseFloat(match[1]) }
      }
    },
    // Descriptive
    {
      pattern: /(large|big|huge|oversized)\s*lot/,
      handler: () => {
        if (!filters.features) filters.features = {}
        filters.features.largeLot = true
        return { minLotSizeAcres: 0.5 }
      }
    },
    {
      pattern: /(small|compact|city|urban)\s*lot/,
      handler: () => {
        if (!filters.features) filters.features = {}
        filters.features.smallLot = true
        return { maxLotSizeAcres: 0.25 }
      }
    }
  ]
  
  for (const { pattern, handler } of lotSizePatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      const lotFilters = handler(match)
      Object.assign(filters, lotFilters)
      break
    }
  }
  
  // =========================================================================
  // 27. STORIES / LEVELS
  // =========================================================================
  const storyPatterns = [
    { pattern: /(\d+)\s*(?:story|stories|storey|storeys|level|levels)/, extract: true },
    { pattern: /(single|one)\s*(?:story|storey|level)/, stories: 1 },
    { pattern: /(two|2)\s*(?:story|stories|storey|storeys|level|levels)/, stories: 2 },
    { pattern: /(three|3)\s*(?:story|stories|storey|storeys|level|levels)/, stories: 3 },
    { pattern: /multi[\s-]*(?:level|story|storey)/, multiLevel: true },
    { pattern: /split[\s-]*level/, splitLevel: true },
    { pattern: /bi[\s-]*level/, biLevel: true }
  ]
  
  for (const item of storyPatterns) {
    const match = query.match(item.pattern)
    if (match) {
      if (item.extract && match[1]) {
        filters.stories = parseInt(match[1])
      } else if (item.stories) {
        filters.stories = item.stories
      } else if (item.multiLevel) {
        if (!filters.features) filters.features = {}
        filters.features.multiLevel = true
      } else if (item.splitLevel) {
        if (!filters.features) filters.features = {}
        filters.features.splitLevel = true
      } else if (item.biLevel) {
        if (!filters.features) filters.features = {}
        filters.features.biLevel = true
      }
      break
    }
  }
  
  // =========================================================================
  // 28. YEAR BUILT / AGE - Enhanced
  // =========================================================================
  const yearPatterns = [
    // Specific year range: "built between 2000 and 2010"
    {
      pattern: /built\s*(?:between\s*)?(\d{4})\s*(?:[-–—]|and|to)\s*(\d{4})/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1] || !match[2]) return {}
        return {
          minYearBuilt: parseInt(match[1]),
          maxYearBuilt: parseInt(match[2])
        }
      }
    },
    // After year: "built after 2000", "newer than 2010"
    {
      pattern: /(?:built\s*(?:after|since)|newer\s*than|from)\s*(\d{4})/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { minYearBuilt: parseInt(match[1]) }
      }
    },
    // Before year: "built before 2000", "older than 1990"
    {
      pattern: /(?:built\s*(?:before|prior\s*to)|older\s*than)\s*(\d{4})/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { maxYearBuilt: parseInt(match[1]) }
      }
    },
    // Year or newer: "2010 or newer"
    {
      pattern: /(\d{4})\s*or\s*newer/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { minYearBuilt: parseInt(match[1]) }
      }
    },
    // Descriptive
    {
      pattern: /(?:brand\s*)?new\s*(?:construction|build|home)|newly\s*built|recently\s*(?:built|constructed)/,
      handler: () => ({ minYearBuilt: new Date().getFullYear() - 5 })
    },
    {
      pattern: /(?:less\s*than|under|within)\s*(\d+)\s*years?\s*old/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { minYearBuilt: new Date().getFullYear() - parseInt(match[1]) }
      }
    },
    {
      pattern: /vintage|historic|heritage|character\s*home/,
      handler: () => ({ maxYearBuilt: 1950 })
    },
    {
      pattern: /mid[\s-]*century/,
      handler: () => ({ minYearBuilt: 1945, maxYearBuilt: 1975 })
    }
  ]
  
  for (const { pattern, handler } of yearPatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      const yearFilters = handler(match)
      Object.assign(filters, yearFilters)
      break
    }
  }
  
  // =========================================================================
  // 29. ZONING - Enhanced
  // =========================================================================
  const zoningPatterns = [
    { keywords: ['residential zoning', 'r1', 'r2', 'r3', 'single family zoning'], zoning: 'residential' },
    { keywords: ['rural residential', 'country residential', 'cr zoning'], zoning: 'rural_residential' },
    { keywords: ['agricultural', 'ag zoning', 'farm zoning', 'farmland'], zoning: 'agricultural' },
    { keywords: ['mixed use', 'mixed-use', 'commercial residential'], zoning: 'mixed_use' },
    { keywords: ['commercial', 'commercial zoning', 'business zoning'], zoning: 'commercial' },
    { keywords: ['industrial', 'industrial zoning'], zoning: 'industrial' },
    { keywords: ['multi-family', 'multifamily zoning', 'apartment zoning'], zoning: 'multi_family' }
  ]
  
  for (const { keywords, zoning } of zoningPatterns) {
    if (queryContainsAny(query, keywords)) {
      filters.zoning = zoning
      break
    }
  }
  
  // =========================================================================
  // 30. TAX AMOUNT - NEW
  // =========================================================================
  const taxPatterns = [
    { 
      pattern: /(?:property\s*)?tax(?:es)?\s*(?:under|below|less\s*than)\s*\$?(\d+(?:,\d{3})?)/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { maxTaxAmount: parseInt(match[1].replace(',', '')) }
      }
    },
    {
      pattern: /low\s*(?:property\s*)?tax(?:es)?/,
      handler: () => ({ maxTaxAmount: 3000 })
    }
  ]
  
  for (const { pattern, handler } of taxPatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      Object.assign(filters, handler(match))
      break
    }
  }
  
  // =========================================================================
  // 31. LOCATION / AREA - Fixed for lowercase
  // =========================================================================
  const locationPatterns = [
    // Area types: "in downtown", "in suburbs"
    {
      pattern: /(?:in|at)\s+(downtown|uptown|suburbs?|city\s*cent(?:er|re)|urban|rural|country)/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        return { locationType: match[1].trim() }
      }
    },
    // Specific area/neighborhood: "in [AreaName]" - captures multi-word names
    {
      pattern: /(?:in|at|near)\s+(?:the\s+)?([a-z][a-z\s]{2,30})(?:\s+(?:area|neighborhood|neighbourhood|community|district))?/,
      handler: (match: RegExpMatchArray) => {
        if (!match[1]) return {}
        const location = match[1].trim()
        // Filter out common words that aren't locations
        const excludeWords = ['the', 'a', 'an', 'this', 'that', 'my', 'your', 'our', 'price', 'range', 'bedroom', 'bathroom', 'house', 'home', 'property', 'under', 'above', 'below', 'with', 'and', 'or']
        if (!excludeWords.includes(location) && location.length > 2) {
          return { location }
        }
        return {}
      }
    }
  ]
  
  for (const { pattern, handler } of locationPatterns) {
    const match = query.match(pattern)
    if (match && match[0]) {
      const locationFilters = handler(match)
      if (Object.keys(locationFilters).length > 0) {
        Object.assign(filters, locationFilters)
        break
      }
    }
  }
  
  // =========================================================================
  // 32. SUBDIVISION / NEIGHBORHOOD NAME - NEW
  // =========================================================================
  const subdivisionPattern = /(?:subdivision|neighborhood|neighbourhood|community)\s*(?:of|called|named)?\s*[:\-]?\s*([a-z][a-z\s]{2,40})/
  const subdivisionMatch = query.match(subdivisionPattern)
  if (subdivisionMatch && subdivisionMatch[1]) {
    filters.subdivision = subdivisionMatch[1].trim()
  }
  
  // =========================================================================
  // 33. INVESTMENT PROPERTIES - NEW
  // =========================================================================
  const investmentPatterns = [
    { keywords: ['investment property', 'rental property', 'income property', 'revenue property'], feature: 'investmentProperty' },
    { keywords: ['tenant', 'rented', 'currently rented', 'tenant in place'], feature: 'tenantInPlace' },
    { keywords: ['positive cash flow', 'cash flow positive', 'cash flowing'], feature: 'positiveCashFlow' },
    { keywords: ['cap rate', 'capitalization rate'], feature: 'capRate' }
  ]
  
  for (const { keywords, feature } of investmentPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 34. SPECIAL REQUIREMENTS - NEW
  // =========================================================================
  const specialPatterns = [
    { keywords: ['pet friendly', 'pets allowed', 'dog friendly', 'cat friendly'], feature: 'petFriendly' },
    { keywords: ['smoking allowed', 'smoker friendly'], feature: 'smokingAllowed' },
    { keywords: ['no smoking', 'non-smoking', 'smoke free'], feature: 'noSmoking' },
    { keywords: ['furnished', 'fully furnished'], feature: 'furnished' },
    { keywords: ['unfurnished', 'not furnished'], feature: 'unfurnished' },
    { keywords: ['utilities included', 'all inclusive'], feature: 'utilitiesIncluded' },
    { keywords: ['short term', 'short-term', 'month to month'], feature: 'shortTerm' },
    { keywords: ['long term', 'long-term', 'annual lease'], feature: 'longTerm' }
  ]
  
  for (const { keywords, feature } of specialPatterns) {
    if (queryContainsAny(query, keywords)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = true
    }
  }
  
  // =========================================================================
  // 35. LISTING STATUS - Sold, Active, Available
  // =========================================================================
  const statusPatterns = [
    // Sold properties - user wants to see sold listings
    { 
      keywords: ['sold', 'recently sold', 'sold properties', 'sold homes', 'sold listings', 'closed'], 
      status: 'sold' 
    },
    // Exclude sold - user explicitly wants only active
    { 
      keywords: ['not sold', 'exclude sold', 'no sold', 'available', 'active', 'active listings', 'for sale', 'on the market', 'currently listed'], 
      status: 'for_sale' 
    },
    // Pending/Under contract
    { 
      keywords: ['pending', 'under contract', 'conditionally sold', 'conditional'], 
      status: 'pending' 
    }
  ]
  
  for (const { keywords, status } of statusPatterns) {
    if (queryContainsAny(query, keywords)) {
      filters.status = status
      break
    }
  }
  
  // Default to for_sale if no status specified (exclude sold by default)
  if (!filters.status) {
    filters.status = 'for_sale'
  }
  
  return filters
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Parse price string to number
function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/,/g, ''))
}

// Convert number words to digits
function convertNumberWordToDigit(word: string): number | null {
  const numberMap: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12
  }
  
  if (/^\d+(?:\.\d+)?$/.test(word)) {
    return parseFloat(word)
  }
  
  return numberMap[word.toLowerCase()] || null
}

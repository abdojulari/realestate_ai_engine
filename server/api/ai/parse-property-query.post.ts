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
    
    // Phase 1: Rule-based parsing
    const filters = parseWithRules(query.toLowerCase())
    
    // Calculate confidence score based on how many features we extracted
    const extractedCount = Object.keys(filters).length
    const confidence = Math.min(extractedCount * 0.25 + 0.1, 0.95) // Better scoring, max 0.95
    
    console.log('[AI PARSER] Extracted filters:', filters)
    console.log('[AI PARSER] Confidence:', confidence)
    
    return {
      filters,
      confidence,
      method: 'rule-based',
      extractedFeatures: Object.keys(filters),
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

// Phase 1: Rule-based natural language parser
function parseWithRules(query: string): Record<string, any> {
  const filters: Record<string, any> = {}
  
  // 1. BEDROOMS - "4 bedroom", "four bed", "4-bed", "4 br", "3+ bedrooms"
  const bedroomPatterns = [
    /(\d+)\+?\s*(?:bed|bedroom|br)s?/,
    /(\d+)\s*(?:or\s*more|plus|\+)\s*(?:bed|bedroom|br)s?/,
    /(one|two|three|four|five|six|seven|eight)\s*(?:bed|bedroom|br)s?/,
    /(\d+)[\s-]*(?:bed|bedroom|br)/,
    /(\d+)\s*\+\s*(?:bed|bedroom|br)s?/
  ]
  
  for (const pattern of bedroomPatterns) {
    const match = query.match(pattern)
    if (match) {
      const bedCount = convertNumberWordToDigit(match[1])
      if (bedCount) filters.beds = bedCount
      break
    }
  }
  
  // 2. BATHROOMS - "2 bath", "2.5 bathroom", "two and half bath"
  const bathroomPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:bath|bathroom)s?/,
    /(one|two|three|four|five)\s*(?:bath|bathroom)s?/,
    /(\d+)\s*and\s*half\s*(?:bath|bathroom)s?/
  ]
  
  for (const pattern of bathroomPatterns) {
    const match = query.match(pattern)
    if (match) {
      let bathCount = convertNumberWordToDigit(match[1])
      if (match[0].includes('half')) bathCount += 0.5
      if (bathCount) filters.baths = bathCount
      break
    }
  }
  
  // 3. GARAGE - "double garage", "2 car garage", "garage for 2", "parking"
  const garagePatterns = [
    /(double|2[\s-]*car|two[\s-]*car)\s*garage/,
    /garage\s*(?:for\s*)?(\d+)/,
    /(single|1[\s-]*car|one[\s-]*car)\s*garage/,
    /(?:with\s*)?(?:a\s*)?garage/,
    /parking/
  ]
  
  for (const pattern of garagePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[0].includes('double') || match[0].includes('2') || match[0].includes('two')) {
        filters.garageSpaces = 2
      } else if (match[0].includes('single') || match[0].includes('1') || match[0].includes('one')) {
        filters.garageSpaces = 1
      } else {
        filters.garage = true
      }
      break
    }
  }
  
  // 4. BASEMENT - "finished basement", "basement finished", "walkout basement"
  const basementPatterns = [
    /(finished|completed|done)\s*basement/,
    /basement\s*(finished|completed|done)/,
    /(walkout|walk[\s-]*out)\s*basement/,
    /basement\s*(walkout|walk[\s-]*out)/,
    /(?:with\s*)?(?:a\s*)?basement/
  ]
  
  for (const pattern of basementPatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[0].includes('finished') || match[0].includes('completed') || match[0].includes('done')) {
        filters.basement = 'finished'
      } else if (match[0].includes('walkout') || match[0].includes('walk-out')) {
        filters.basement = 'walkout'
      } else {
        filters.basement = true
      }
      break
    }
  }
  
  // 5. PROPERTY TYPE - "house", "condo", "townhouse"
  const typePatterns = [
    /(house|home)/,
    /(condo|condominium|apartment)/,
    /(townhouse|town[\s-]*house|rowhouse)/,
    /(duplex|semi[\s-]*detached)/
  ]
  
  for (const pattern of typePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[0].includes('condo') || match[0].includes('apartment')) {
        filters.type = 'condo'
      } else if (match[0].includes('townhouse') || match[0].includes('row')) {
        filters.type = 'townhouse'
      } else if (match[0].includes('duplex') || match[0].includes('semi')) {
        filters.type = 'duplex'
      } else {
        filters.type = 'house'
      }
      break
    }
  }
  
  // 6. PRICE - "under 500k", "below 600000", "max 750k", "budget 400k"
  const pricePatterns = [
    /(?:under|below|max|maximum|budget)\s*\$?(\d+)k?/,
    /\$(\d+)k?\s*(?:or\s*)?(?:less|under|below)/,
    /price\s*(?:range\s*)?(?:up\s*to\s*)?\$?(\d+)k?/
  ]
  
  for (const pattern of pricePatterns) {
    const match = query.match(pattern)
    if (match) {
      let price = parseInt(match[1])
      if (match[0].includes('k') && price < 10000) price *= 1000
      filters.maxPrice = price
      break
    }
  }
  
  // 7. PROXIMITY - "near school", "close to hospital", "by clinic"
  const proximityPatterns = [
    /(?:near|close\s*to|by|next\s*to)\s*(school|clinic|hospital|park|mall|downtown|transit)/gi
  ]
  
  const proximityMatches = query.match(proximityPatterns)
  if (proximityMatches) {
    const nearItems = proximityMatches.map(match => {
      return match.replace(/(?:near|close\s*to|by|next\s*to)\s*/i, '').trim()
    })
    filters.near = nearItems
  }
  
  // 8. ENHANCED FEATURES - Now supporting CREA residential fields
  const featurePatterns = [
    // Basic features
    { pattern: /pool/, feature: 'pool', value: true },
    { pattern: /fireplace/, feature: 'fireplace', value: true },
    { pattern: /waterfront|water\s*front/, feature: 'waterfront', value: true },
    { pattern: /central\s*(?:air|ac)|air\s*conditioning/, feature: 'centralAC', value: true },
    { pattern: /smart\s*home/, feature: 'smartHome', value: true },
    { pattern: /solar\s*panels?/, feature: 'solarPanels', value: true },
    { pattern: /large\s*(?:yard|backyard|garden)/, feature: 'largeYard', value: true },
    { pattern: /fenced\s*(?:yard|backyard)/, feature: 'fencedYard', value: true },
    
    // NEW: Views & Location Features
    { pattern: /ocean\s*view|sea\s*view/, feature: 'oceanView', value: true },
    { pattern: /mountain\s*view|mountains?\s*view/, feature: 'mountainView', value: true },
    { pattern: /lake\s*view|water\s*view/, feature: 'lakeView', value: true },
    { pattern: /city\s*view|downtown\s*view/, feature: 'cityView', value: true },
    { pattern: /golf\s*(?:course\s*)?view/, feature: 'golfView', value: true },
    
    // NEW: Utilities & Infrastructure
    { pattern: /well\s*water|private\s*well/, feature: 'wellWater', value: true },
    { pattern: /municipal\s*water|city\s*water/, feature: 'municipalWater', value: true },
    { pattern: /septic\s*(?:system|tank)?/, feature: 'septic', value: true },
    { pattern: /municipal\s*sewer|city\s*sewer/, feature: 'municipalSewer', value: true },
    { pattern: /irrigation\s*system/, feature: 'irrigation', value: true },
    
    // NEW: Building Characteristics
    { pattern: /new\s*(?:construction|build|home)/, feature: 'newConstruction', value: true },
    { pattern: /renovated|updated|upgraded/, feature: 'renovated', value: true },
    { pattern: /move[\s-]*in\s*ready/, feature: 'moveInReady', value: true },
    { pattern: /custom\s*(?:built|home)/, feature: 'customBuilt', value: true },
    
    // NEW: Architectural Styles
    { pattern: /ranch\s*(?:style)?/, feature: 'ranchStyle', value: true },
    { pattern: /colonial\s*(?:style)?/, feature: 'colonialStyle', value: true },
    { pattern: /bungalow/, feature: 'bungalowStyle', value: true },
    { pattern: /modern\s*(?:style)?/, feature: 'modernStyle', value: true },
    { pattern: /traditional\s*(?:style)?/, feature: 'traditionalStyle', value: true },
    
    // NEW: Rural/Acreage Features
    { pattern: /acreage|acres?/, feature: 'acreage', value: true },
    { pattern: /large\s*lot|big\s*lot/, feature: 'largeLot', value: true },
    { pattern: /private\s*(?:lot|property)/, feature: 'private', value: true },
    { pattern: /rural|country\s*(?:setting|living)?/, feature: 'rural', value: true },
    { pattern: /horse\s*(?:property|facilities)/, feature: 'horseProperty', value: true },
    { pattern: /barn|outbuilding/, feature: 'barn', value: true },
    
    // NEW: Accessibility & Universal Design
    { pattern: /wheelchair\s*accessible/, feature: 'wheelchairAccessible', value: true },
    { pattern: /main\s*floor\s*(?:living|bedroom)/, feature: 'mainFloorLiving', value: true },
    { pattern: /single\s*(?:level|story)/, feature: 'singleLevel', value: true }
  ]
  
  for (const { pattern, feature, value } of featurePatterns) {
    if (pattern.test(query)) {
      if (!filters.features) filters.features = {}
      filters.features[feature] = value
    }
  }
  
  // 9. SIZE - "spacious", "large", "compact", specific sqft
  const sizePatterns = [
    /(\d+)\s*(?:sq\s*ft|square\s*feet|sqft)/,
    /(spacious|large|big)/,
    /(compact|small|cozy)/
  ]
  
  for (const pattern of sizePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[1] && /\d+/.test(match[1])) {
        filters.minSqft = parseInt(match[1])
      } else if (match[1] && ['spacious', 'large', 'big'].includes(match[1])) {
        filters.minSqft = 2000 // Assume large = 2000+ sqft
      } else if (match[1] && ['compact', 'small', 'cozy'].includes(match[1])) {
        filters.maxSqft = 1500 // Assume small = under 1500 sqft
      }
      break
    }
  }
  
  // 10. LOT SIZE & ACREAGE - "2 acres", "large lot", "half acre"
  const lotSizePatterns = [
    /(\d+(?:\.\d+)?)\s*acres?/,
    /(half|quarter|\d+\/\d+)\s*acres?/,
    /(\d+)\s*(?:sq\s*ft|square\s*feet)\s*lot/,
    /(large|big|huge)\s*lot/,
    /(small|compact)\s*lot/
  ]
  
  for (const pattern of lotSizePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[1] && /\d+/.test(match[1])) {
        const size = parseFloat(match[1])
        if (match[0].includes('acre')) {
          filters.lotSizeAcres = size
        } else if (match[0].includes('sq')) {
          filters.lotSizeSqFt = size
        }
      } else if (match[1] === 'half') {
        filters.lotSizeAcres = 0.5
      } else if (match[1] === 'quarter') {
        filters.lotSizeAcres = 0.25
      } else if (['large', 'big', 'huge'].includes(match[1])) {
        filters.largeLot = true
      } else if (['small', 'compact'].includes(match[1])) {
        filters.smallLot = true
      }
      break
    }
  }
  
  // 11. BUILDING STORIES - "2 story", "single level", "multi-level"
  const storyPatterns = [
    /(\d+)\s*(?:story|stories|level|levels)/,
    /(single|one)\s*(?:story|level)/,
    /(two|three|four)\s*(?:story|stories|level|levels)/,
    /multi[\s-]*(?:level|story)/,
    /split[\s-]*level/
  ]
  
  for (const pattern of storyPatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[1] && /\d+/.test(match[1])) {
        filters.stories = parseInt(match[1])
      } else if (match[1] === 'single' || match[1] === 'one') {
        filters.stories = 1
      } else if (match[1] === 'two') {
        filters.stories = 2
      } else if (match[1] === 'three') {
        filters.stories = 3
      } else if (match[1] === 'four') {
        filters.stories = 4
      } else if (match[0].includes('multi')) {
        filters.multiLevel = true
      } else if (match[0].includes('split')) {
        filters.splitLevel = true
      }
      break
    }
  }
  
  // 12. YEAR BUILT / AGE - "new home", "built after 2000", "newer than 2010"
  const agePatterns = [
    /built\s*(?:after|since)\s*(\d{4})/,
    /newer\s*than\s*(\d{4})/,
    /(?:from\s*)?(\d{4})\s*or\s*newer/,
    /new\s*(?:construction|build|home)/,
    /recently\s*built/
  ]
  
  for (const pattern of agePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[1] && /\d{4}/.test(match[1])) {
        filters.minYearBuilt = parseInt(match[1])
      } else if (match[0].includes('new') || match[0].includes('recent')) {
        filters.minYearBuilt = new Date().getFullYear() - 5 // Within 5 years
      }
      break
    }
  }
  
  // 13. PROPERTY CONDITION - "move-in ready", "needs work", "renovated"
  const conditionPatterns = [
    /move[\s-]*in\s*ready/,
    /excellent\s*condition/,
    /good\s*condition/,
    /needs?\s*work|fixer[\s-]*upper/,
    /renovated|updated|upgraded/,
    /original\s*condition/
  ]
  
  for (const pattern of conditionPatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[0].includes('move-in') || match[0].includes('excellent')) {
        filters.condition = 'excellent'
      } else if (match[0].includes('good')) {
        filters.condition = 'good'
      } else if (match[0].includes('needs') || match[0].includes('fixer')) {
        filters.condition = 'needs_work'
      } else if (match[0].includes('renovated') || match[0].includes('updated')) {
        filters.condition = 'renovated'
      } else if (match[0].includes('original')) {
        filters.condition = 'original'
      }
      break
    }
  }
  
  // 14. ZONING - "residential", "rural residential", "agricultural"
  const zoningPatterns = [
    /residential\s*zoning/,
    /rural\s*residential/,
    /agricultural\s*zoning/,
    /mixed\s*use/
  ]
  
  for (const pattern of zoningPatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[0].includes('rural')) {
        filters.zoning = 'rural_residential'
      } else if (match[0].includes('agricultural')) {
        filters.zoning = 'agricultural'
      } else if (match[0].includes('mixed')) {
        filters.zoning = 'mixed_use'
      } else {
        filters.zoning = 'residential'
      }
      break
    }
  }
  
  // 15. LOCATION - "downtown", "suburbs", specific cities
  const locationPatterns = [
    /(?:in|at)\s*(downtown|uptown|suburbs?|city\s*center)/,
    /(?:in|at)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
  ]
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern)
    if (match) {
      filters.location = match[1].trim()
      break
    }
  }
  
  return filters
}

// Helper function to convert number words to digits
function convertNumberWordToDigit(word: string): number | null {
  const numberMap: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  }
  
  if (/^\d+$/.test(word)) {
    return parseInt(word)
  }
  
  return numberMap[word.toLowerCase()] || null
}

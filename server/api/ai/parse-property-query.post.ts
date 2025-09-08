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
    const confidence = Math.min(extractedCount * 0.2, 1.0) // Max confidence of 1.0
    
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
  
  // 1. BEDROOMS - "4 bedroom", "four bed", "4-bed", "4 br"
  const bedroomPatterns = [
    /(\d+)\s*(?:bed|bedroom|br)s?/,
    /(one|two|three|four|five|six|seven|eight)\s*(?:bed|bedroom|br)s?/,
    /(\d+)[\s-]*(?:bed|bedroom|br)/
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
  
  // 8. FEATURES - "pool", "fireplace", "waterfront", "central air"
  const featurePatterns = [
    { pattern: /pool/, feature: 'pool', value: true },
    { pattern: /fireplace/, feature: 'fireplace', value: true },
    { pattern: /waterfront|water\s*front/, feature: 'waterfront', value: true },
    { pattern: /central\s*(?:air|ac)|air\s*conditioning/, feature: 'centralAC', value: true },
    { pattern: /smart\s*home/, feature: 'smartHome', value: true },
    { pattern: /solar\s*panels?/, feature: 'solarPanels', value: true },
    { pattern: /large\s*(?:yard|backyard|garden)/, feature: 'largeYard', value: true },
    { pattern: /fenced\s*(?:yard|backyard)/, feature: 'fencedYard', value: true }
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
  
  // 10. LOCATION - "downtown", "suburbs", specific cities
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

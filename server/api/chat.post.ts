import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { realEstateFaqs, type FAQ } from '../data/realEstateFaqs'
import { requireFeature, FEATURES } from '../utils/license'

const prisma = new PrismaClient()

type Intent = 'faq' | 'property' | 'general'

const RESIDENTIAL_TYPES = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']

const CITY_ALIASES: Array<{ name: string; aliases: string[] }> = [
  { name: 'Calgary', aliases: ['calgary'] },
  { name: 'Edmonton', aliases: ['edmonton'] },
  { name: 'Red Deer', aliases: ['red deer'] },
  { name: 'Lethbridge', aliases: ['lethbridge'] },
  { name: 'Medicine Hat', aliases: ['medicine hat'] },
  { name: 'Grande Prairie', aliases: ['grande prairie'] },
  { name: 'Airdrie', aliases: ['airdrie'] },
  { name: 'Spruce Grove', aliases: ['spruce grove'] },
  { name: 'Okotoks', aliases: ['okotoks'] },
  { name: 'Camrose', aliases: ['camrose'] },
  { name: 'Lloydminster', aliases: ['lloydminster'] },
  { name: 'Canmore', aliases: ['canmore'] },
  { name: 'Cochrane', aliases: ['cochrane'] },
  { name: 'Chestermere', aliases: ['chestermere'] },
  { name: 'Sherwood Park', aliases: ['sherwood park'] },
  { name: 'St. Albert', aliases: ['st albert', 'st. albert'] }
]

export default defineEventHandler(async (event) => {
  // Check license for chatbot feature
  await requireFeature(FEATURES.CHATBOT, event)
  
  const body = await readBody(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  const intent = detectIntent(message)
  const leadIntent = isLeadIntent(message)

  const matchedFAQs = findRelevantFAQs(realEstateFaqs, message, 4)
  const properties = intent === 'property'
    ? await fetchRelevantProperties(message)
    : []

  const context = buildContext({
    faqs: matchedFAQs,
    properties
  })

  const answer = await askChatbot({
    userMessage: message,
    context,
    leadIntent
  })

  const followUpQuestions = buildFollowUpQuestions({
    intent,
    leadIntent,
    message,
    properties
  })

  const cta = leadIntent
    ? 'If you would like help, share your name and email. Your details may be used for follow-ups, newsletters, and marketing. You can opt out anytime.'
    : ''

  return {
    answer,
    intent,
    leadIntent,
    cta,
    followUpQuestions
  }
})

function detectIntent(message: string): Intent {
  const normalized = normalizeText(message)
  const tokens = tokenize(normalized)

  const propertyTerms = [
    'property', 'properties', 'home', 'house', 'condo', 'townhouse', 'listing',
    'mls', 'bed', 'bedroom', 'bath', 'bathroom', 'price', 'for sale', 'market',
    'neighborhood', 'neighbourhood', 'city', 'viewing', 'schedule', 'showing'
  ]

  const faqTerms = [
    'how', 'what', 'when', 'where', 'why', 'can i', 'do i', 'should i',
    'cost', 'fees', 'closing', 'down payment', 'mortgage', 'pre-approval',
    'preapproval', 'valuation', 'estimate', 'afford', 'timeline'
  ]

  let propertyScore = 0
  let faqScore = 0

  if (message.includes('?')) faqScore += 2

  for (const term of propertyTerms) {
    if (normalized.includes(term)) propertyScore += 1
  }

  for (const term of faqTerms) {
    if (normalized.includes(term)) faqScore += 1
  }

  // City mention increases property intent
  if (extractCity(normalized)) propertyScore += 2

  // If we already have matched FAQs, bias toward FAQ intent
  if (findRelevantFAQs(realEstateFaqs, message, 1).length > 0) {
    faqScore += 1
  }

  if (propertyScore >= faqScore && propertyScore > 0) return 'property'
  if (faqScore > 0) return 'faq'
  return 'general'
}

function isLeadIntent(message: string): boolean {
  return /\b(buy|buying|buyer|sell|selling|seller|list|listing|view|schedule|showing|tour|contact|call|email|valuation|estimate|home worth)\b/i.test(message)
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s$.,-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokenize(text: string): string[] {
  return text
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2)
}

function scoreFAQ(faq: FAQ, query: string): number {
  const text = `${faq.question} ${faq.answer} ${faq.tags.join(' ')}`.toLowerCase()
  const tokens = tokenize(normalizeText(query))
  let score = 0

  for (const token of tokens) {
    if (text.includes(token)) score += 1
  }

  for (const tag of faq.tags) {
    if (text.includes(tag.toLowerCase()) && normalizeText(query).includes(tag.toLowerCase())) {
      score += 2
    }
  }

  return score
}

function findRelevantFAQs(faqs: FAQ[], query: string, limit = 3): FAQ[] {
  return faqs
    .map(faq => ({ faq, score: scoreFAQ(faq, query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => result.faq)
}

function extractCity(normalizedQuery: string): string | null {
  for (const city of CITY_ALIASES) {
    for (const alias of city.aliases) {
      if (normalizedQuery.includes(alias)) return city.name
    }
  }
  return null
}

function extractPropertyType(normalizedQuery: string): string[] | null {
  if (normalizedQuery.includes('condo') || normalizedQuery.includes('condominium')) {
    return ['condo', 'multi-family']
  }
  if (normalizedQuery.includes('townhouse') || normalizedQuery.includes('townhome') || normalizedQuery.includes('row house')) {
    return ['townhouse']
  }
  if (normalizedQuery.includes('land') || normalizedQuery.includes('lot') || normalizedQuery.includes('acreage')) {
    return ['land']
  }
  if (normalizedQuery.includes('house') || normalizedQuery.includes('home') || normalizedQuery.includes('detached')) {
    return ['house']
  }
  return null
}

function parsePriceValue(value: string, suffix?: string): number {
  const normalized = value.replace(/,/g, '')
  const amount = parseFloat(normalized)
  if (!isFinite(amount)) return 0
  if (suffix?.toLowerCase() === 'k') return amount * 1000
  if (suffix?.toLowerCase() === 'm') return amount * 1000000
  return amount
}

function extractPriceRange(normalizedQuery: string): { minPrice?: number; maxPrice?: number } {
  const rangeMatch = normalizedQuery.match(/\$?(\d+(?:,\d{3})?)(k|m)?\s*(?:-|–|—|to)\s*\$?(\d+(?:,\d{3})?)(k|m)?/)
  if (rangeMatch && rangeMatch[1] && rangeMatch[3]) {
    return {
      minPrice: parsePriceValue(rangeMatch[1], rangeMatch[2]),
      maxPrice: parsePriceValue(rangeMatch[3], rangeMatch[4])
    }
  }

  const maxMatch = normalizedQuery.match(/(?:under|below|max|up to|less than)\s*\$?(\d+(?:,\d{3})?)(k|m)?/)
  if (maxMatch && maxMatch[1]) {
    return { maxPrice: parsePriceValue(maxMatch[1], maxMatch[2]) }
  }

  const minMatch = normalizedQuery.match(/(?:over|above|minimum|at least|starting at|from)\s*\$?(\d+(?:,\d{3})?)(k|m)?/)
  if (minMatch && minMatch[1]) {
    return { minPrice: parsePriceValue(minMatch[1], minMatch[2]) }
  }

  return {}
}

function extractBeds(normalizedQuery: string): number | null {
  const match = normalizedQuery.match(/(\d+)\s*(?:bed|bedroom|br)s?/)
  if (match && match[1]) return parseInt(match[1])
  return null
}

function extractBaths(normalizedQuery: string): number | null {
  const match = normalizedQuery.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)s?/)
  if (match && match[1]) return parseFloat(match[1])
  return null
}

function extractMLS(normalizedQuery: string): string | null {
  const match = normalizedQuery.match(/mls\s*#?\s*([a-z0-9-]+)/i)
  if (match && match[1]) return match[1].trim()
  return null
}

async function fetchRelevantProperties(message: string) {
  const normalized = normalizeText(message)
  const city = extractCity(normalized)
  const typeFilter = extractPropertyType(normalized)
  const beds = extractBeds(normalized)
  const baths = extractBaths(normalized)
  const { minPrice, maxPrice } = extractPriceRange(normalized)
  const mlsNumber = extractMLS(normalized)

  const where: any = {
    status: 'for_sale',
    type: { in: RESIDENTIAL_TYPES }
  }

  if (city) where.city = { contains: city, mode: 'insensitive' }
  if (typeFilter) where.type = { in: typeFilter }
  if (beds) where.beds = { gte: beds }
  if (baths) where.baths = { gte: baths }
  if (minPrice || maxPrice) {
    where.price = {
      gte: minPrice || undefined,
      lte: maxPrice || undefined
    }
  }
  if (mlsNumber) {
    where.mlsNumber = { contains: mlsNumber, mode: 'insensitive' }
  }

  return prisma.property.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 4,
    select: {
      id: true,
      title: true,
      price: true,
      beds: true,
      baths: true,
      city: true,
      address: true,
      mlsNumber: true,
      type: true
    }
  })
}

function isSimilarQuestion(userMessage: string, suggestedQuestion: string): boolean {
  const userNorm = normalizeText(userMessage)
  const suggestedNorm = normalizeText(suggestedQuestion)

  // Check if user message contains most key words from the suggested question
  const suggestedWords = suggestedNorm.split(' ').filter(w => w.length > 3)
  const matchCount = suggestedWords.filter(w => userNorm.includes(w)).length

  // If more than 50% of key words match, consider it similar
  return suggestedWords.length > 0 && matchCount / suggestedWords.length > 0.5
}

function buildFollowUpQuestions({
  intent,
  leadIntent,
  message,
  properties
}: {
  intent: Intent
  leadIntent: boolean
  message: string
  properties: Array<{
    title: string
    price: number
    beds: number
    baths: number
    city: string
    address: string
    mlsNumber: string | null
    type: string
  }>
}): string[] {
  const normalized = normalizeText(message)
  const candidates: string[] = []

  if (intent === 'property') {
    if (!normalized.includes('city') && !extractCity(normalized)) {
      candidates.push('Which city are you looking in?')
    }
    if (!normalized.includes('bed') && !extractBeds(normalized)) {
      candidates.push('How many bedrooms do you need?')
    }
    if (!normalized.includes('bath') && !extractBaths(normalized)) {
      candidates.push('How many bathrooms should the home have?')
    }
    if (!normalized.includes('$') && !extractPriceRange(normalized).maxPrice) {
      candidates.push('What price range should I focus on?')
    }
    if (properties.length > 0) {
      candidates.push('Would you like details on any of these listings?')
    }
  } else if (intent === 'faq') {
    candidates.push('Do you want a quick checklist or a deeper walkthrough?')
    if (!normalized.includes('mortgage') && !normalized.includes('pre-approval')) {
      candidates.push('Are you already pre-approved for a mortgage?')
    }
    candidates.push('Would you like to speak with an agent about this?')
  } else {
    candidates.push('Are you looking to buy, sell, or just explore the market?')
    candidates.push('What type of property are you interested in?')
  }

  if (leadIntent) {
    candidates.push('What timeline are you working with?')
  }

  // Filter out questions similar to what the user already asked
  const filtered = candidates.filter(q => !isSimilarQuestion(message, q))

  return filtered.slice(0, 3)
}

function buildContext({
  faqs,
  properties
}: {
  faqs: FAQ[]
  properties?: Array<{
    title: string
    price: number
    beds: number
    baths: number
    city: string
    address: string
    mlsNumber: string | null
    type: string
  }>
}) {
  let context = 'You are a real estate assistant.\n\n'

  if (faqs.length) {
    context += 'FAQ Knowledge:\n'
    faqs.forEach((faq) => {
      context += `Q: ${faq.question}\nA: ${faq.answer}\n`
    })
  }

  if (properties?.length) {
    context += '\nRelevant Properties:\n'
    properties.forEach((property) => {
      context += [
        `Title: ${property.title}`,
        `Type: ${property.type}`,
        `Price: $${property.price}`,
        `Beds: ${property.beds}, Baths: ${property.baths}`,
        `City: ${property.city}`,
        `Address: ${property.address}`,
        `MLS: ${property.mlsNumber || 'N/A'}`
      ].join('\n')
      context += '\n\n'
    })
  }

  return context.trim()
}

async function askChatbot({
  userMessage,
  context,
  leadIntent
}: {
  userMessage: string
  context: string
  leadIntent: boolean
}) {
  const config = useRuntimeConfig()
  const groqApiKey = config.groqApiKey
  const groqApiUrl = config.groqApiUrl || 'https://api.groq.com/openai/v1'

  if (!groqApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GROQ_API_KEY is not configured'
    })
  }

  const leadCaptureRule = leadIntent
    ? '\nIf the user shows buying/selling intent:\n- Ask for name + email\n- Clearly state: "Your details may be used for follow-ups, newsletters, and marketing. You can opt out anytime."\n'
    : ''

  const systemPrompt = `
${context}

Rules:
- Answer using provided knowledge only when possible
- If you lack specific details, ask a brief clarifying question
- If asking about a property, mention MLS if available
- Encourage lead capture politely when intent is shown
- Never hallucinate prices or availability
${leadCaptureRule}
  `.trim()

  const response = await $fetch<{
    choices: Array<{ message?: { content?: string } }>
  }>(`${groqApiUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    }
  })

  return response.choices?.[0]?.message?.content?.trim() || ''
}

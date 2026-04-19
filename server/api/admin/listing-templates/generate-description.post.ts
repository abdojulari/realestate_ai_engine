import { createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import { sanitizeListingDescriptionHtml } from '../../../utils/listingTemplatePayload'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const body = await readBody(event)

    const propertyAddress = assertPlainAddress(body?.propertyAddress)
    let beds = sanitizeOptionalNumber(body?.beds)
    let baths = sanitizeOptionalNumber(body?.baths)
    let sqft = sanitizeOptionalNumber(body?.sqft)
    let type = assertOptionalShortString(body?.type, 'type', 80)
    let price = sanitizeOptionalNumber(body?.price)
    let features = sanitizeFeatures(body?.features)
    let descriptionPlain = ''
    if (body?.description !== undefined && body?.description !== null && body?.description !== '') {
      const html = sanitizeListingDescriptionHtml(body.description)
      descriptionPlain = html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) : ''
    }

    // Auto-enrich from the matching Property record when caller didn't supply
    // structured fields. This is what gives the AI prompt access to the rich
    // CREA-synced data (beds/baths/sqft/type/price + features.* arrays) without
    // requiring the listing-template form to collect them manually.
    const linkedProperty = await findPropertyByAddress(propertyAddress, body?.propertyId)
    if (linkedProperty) {
      if (beds === undefined && typeof linkedProperty.beds === 'number') beds = linkedProperty.beds
      if (baths === undefined && typeof linkedProperty.baths === 'number') baths = linkedProperty.baths
      if (sqft === undefined && typeof linkedProperty.sqft === 'number') sqft = linkedProperty.sqft
      if (!type && typeof linkedProperty.type === 'string') type = linkedProperty.type
      if (price === undefined && typeof linkedProperty.price === 'number') price = linkedProperty.price
      if (!features || features.length === 0) {
        const derived = featuresFromProperty(linkedProperty)
        if (derived.length) features = derived
      }
      if (!descriptionPlain && typeof linkedProperty.description === 'string') {
        descriptionPlain = linkedProperty.description
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 4000)
      }
    }

    // Build AI prompt for listing description
    const prompt = buildListingPrompt({
      propertyAddress,
      beds,
      baths,
      sqft,
      type,
      features,
      price,
      existingDescription: descriptionPlain,
      yearBuilt: linkedProperty?.yearBuilt,
      lotSizeArea: linkedProperty?.lotSizeArea,
      lotSizeUnits: linkedProperty?.lotSizeUnits,
      city: linkedProperty?.city,
      cityRegion: linkedProperty?.cityRegion,
    })

    // Try Google Generative AI if available
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        return {
          success: true,
          description: text,
          source: 'ai'
        }
      } catch (aiError) {
        console.warn('AI generation failed, using template fallback:', aiError)
      }
    }

    // Fallback: Generate a professional template-based description
    const generatedDescription = generateTemplateDescription({
      propertyAddress,
      beds,
      baths,
      sqft,
      type,
      features,
      price,
      yearBuilt: linkedProperty?.yearBuilt,
      city: linkedProperty?.city,
    })

    return {
      success: true,
      description: generatedDescription,
      source: 'template'
    }
  } catch (error: any) {
    console.error('Error generating description:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

function assertPlainAddress(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: 'Property address is required' })
  }
  const t = value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 500)
  if (!t) {
    throw createError({ statusCode: 400, message: 'Property address is required' })
  }
  return t
}

function sanitizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 1e9) return undefined
  return Math.round(n * 100) / 100
}

function assertOptionalShortString(value: unknown, _label: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return undefined
  const t = value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, max)
  return t || undefined
}

function sanitizeFeatures(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 40)
  }
  if (typeof value === 'string') {
    return [value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 500)].filter(Boolean)
  }
  return undefined
}

function buildListingPrompt(data: any): string {
  const lines: string[] = []
  lines.push(`Property: ${data.propertyAddress}`)
  if (data.type) lines.push(`Type: ${data.type}`)
  if (data.price) lines.push(`Price: $${Number(data.price).toLocaleString()}`)
  if (data.beds) lines.push(`Bedrooms: ${data.beds}`)
  if (data.baths) lines.push(`Bathrooms: ${data.baths}`)
  if (data.sqft) lines.push(`Square Feet: ${Number(data.sqft).toLocaleString()}`)
  if (data.yearBuilt) lines.push(`Year Built: ${data.yearBuilt}`)
  if (data.lotSizeArea) lines.push(`Lot Size: ${data.lotSizeArea} ${data.lotSizeUnits || ''}`.trim())
  if (data.cityRegion || data.city) lines.push(`Neighborhood: ${[data.cityRegion, data.city].filter(Boolean).join(', ')}`)
  if (data.features?.length) {
    const featList = Array.isArray(data.features) ? data.features.join(', ') : data.features
    lines.push(`Features: ${featList}`)
  }

  return `Write a premium, professional real estate listing description for:

${lines.join('\n')}
${data.existingDescription ? `\nExisting MLS description for reference (do not contradict facts): ${data.existingDescription}` : ''}

Requirements:
- Write in a luxury real estate tone
- Highlight key selling points
- Use vivid, aspirational language
- Keep it between 150-250 words
- Include a compelling opening line
- End with a call to action
- Do NOT include the price in the description
- Focus on lifestyle and experience`
}

function generateTemplateDescription(data: any): string {
  const type = data.type || 'home'
  const priceRange = data.price > 1000000 ? 'luxury' : data.price > 500000 ? 'premium' : 'exceptional'

  const dimensions = data.beds && data.baths
    ? `Featuring ${data.beds} bedrooms and ${data.baths} bathrooms${data.sqft ? ` across ${Number(data.sqft).toLocaleString()} square feet of thoughtfully designed living space` : ''}${data.yearBuilt ? `, built in ${data.yearBuilt}` : ''}.`
    : ''

  return `Welcome to this ${priceRange} ${type} located at ${data.propertyAddress}${data.city ? ` in ${data.city}` : ''}. ${dimensions}

This remarkable property offers an unparalleled living experience with premium finishes throughout. ${
    data.features && Array.isArray(data.features) && data.features.length > 0
      ? `Notable features include ${data.features.slice(0, 3).join(', ')}.`
      : 'Every detail has been carefully curated to deliver comfort and sophistication.'
  }

The home seamlessly blends modern convenience with timeless elegance, creating an inviting atmosphere for both everyday living and entertaining. Natural light floods the principal rooms, highlighting the quality craftsmanship evident in every corner.

Don't miss this exceptional opportunity. Contact us today to schedule your private viewing.`
}

// Look up the Property record matching this listing template's address.
// Direct id wins; otherwise try exact address (case-insensitive), then a
// loose contains match. Returns null if no confident match.
async function findPropertyByAddress(address: string, propertyId?: unknown) {
  try {
    if (typeof propertyId === 'number' && propertyId > 0) {
      const byId = await prisma.property.findUnique({ where: { id: propertyId } })
      if (byId) return byId
    }
    if (typeof propertyId === 'string' && /^\d+$/.test(propertyId)) {
      const byId = await prisma.property.findUnique({ where: { id: Number(propertyId) } })
      if (byId) return byId
    }
    const normalized = address.trim()
    if (!normalized) return null
    // Postgres `mode: 'insensitive'` for case-insensitive match.
    const exact = await prisma.property.findFirst({
      where: { address: { equals: normalized, mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' },
    })
    if (exact) return exact
    // Fallback: contains the leading portion of the address (street # + name).
    // Stops trying after 80 chars to avoid spurious matches.
    const head = normalized.split(',')[0]?.trim().slice(0, 80)
    if (head && head.length >= 6) {
      return await prisma.property.findFirst({
        where: { address: { contains: head, mode: 'insensitive' } },
        orderBy: { updatedAt: 'desc' },
      })
    }
    return null
  } catch {
    return null
  }
}

// Project a Property into a flat string[] of features for the prompt.
// Pulls from both top-level columns and the rich `features` JSON.
function featuresFromProperty(property: any): string[] {
  const out: string[] = []
  const f = property?.features || {}

  if (property.yearBuilt) out.push(`Built ${property.yearBuilt}`)
  if (property.lotSizeArea) out.push(`Lot ${property.lotSizeArea} ${property.lotSizeUnits || ''}`.trim())
  if (property.propertyCondition) out.push(`Condition: ${property.propertyCondition}`)
  if (property.waterBodyName) out.push(`On ${property.waterBodyName}`)
  if (property.cityRegion) out.push(`${property.cityRegion}`)

  const arrayKeys: Array<[string, string]> = [
    ['architecturalStyle', 'Style'],
    ['heating', 'Heating'],
    ['cooling', 'Cooling'],
    ['flooring', 'Flooring'],
    ['appliances', 'Appliance'],
    ['view', 'View'],
    ['waterfrontFeatures', 'Waterfront'],
    ['interior', ''],
    ['exterior', ''],
    ['lot', ''],
    ['building', ''],
    ['communityFeatures', 'Community'],
    ['fireplaceFeatures', 'Fireplace'],
    ['poolFeatures', 'Pool'],
    ['basement', 'Basement'],
  ]
  for (const [key, prefix] of arrayKeys) {
    const v = f?.[key]
    if (Array.isArray(v) && v.length) {
      for (const item of v) {
        if (typeof item === 'string' && item.trim()) {
          out.push(prefix ? `${prefix}: ${item}` : item)
        }
      }
    }
  }

  if (typeof f?.parking === 'number' && f.parking > 0) out.push(`${f.parking} parking spaces`)
  if (f?.fireplacesTotal) out.push(`${f.fireplacesTotal} fireplaces`)

  // Cap to keep prompt cost reasonable.
  return out.slice(0, 40)
}

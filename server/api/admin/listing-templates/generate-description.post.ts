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
    const beds = sanitizeOptionalNumber(body?.beds)
    const baths = sanitizeOptionalNumber(body?.baths)
    const sqft = sanitizeOptionalNumber(body?.sqft)
    const type = assertOptionalShortString(body?.type, 'type', 80)
    const features = sanitizeFeatures(body?.features)
    const price = sanitizeOptionalNumber(body?.price)
    let descriptionPlain = ''
    if (body?.description !== undefined && body?.description !== null && body?.description !== '') {
      const html = sanitizeListingDescriptionHtml(body.description)
      descriptionPlain = html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) : ''
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
      existingDescription: descriptionPlain
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
      price
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
  return `Write a premium, professional real estate listing description for:

Property: ${data.propertyAddress}
Type: ${data.type || 'Residential'}
Price: ${data.price ? '$' + Number(data.price).toLocaleString() : 'Contact for pricing'}
Bedrooms: ${data.beds || 'N/A'}
Bathrooms: ${data.baths || 'N/A'}
Square Feet: ${data.sqft || 'N/A'}
Features: ${data.features ? (Array.isArray(data.features) ? data.features.join(', ') : data.features) : 'N/A'}
${data.existingDescription ? `\nExisting description to enhance: ${data.existingDescription}` : ''}

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

  return `Welcome to this ${priceRange} ${type} located at ${data.propertyAddress}. ${
    data.beds && data.baths
      ? `Featuring ${data.beds} bedrooms and ${data.baths} bathrooms${data.sqft ? ` across ${Number(data.sqft).toLocaleString()} square feet of thoughtfully designed living space` : ''}.`
      : ''
  }

This remarkable property offers an unparalleled living experience with premium finishes throughout. ${
    data.features && Array.isArray(data.features) && data.features.length > 0
      ? `Notable features include ${data.features.slice(0, 3).join(', ')}.`
      : 'Every detail has been carefully curated to deliver comfort and sophistication.'
  }

The home seamlessly blends modern convenience with timeless elegance, creating an inviting atmosphere for both everyday living and entertaining. Natural light floods the principal rooms, highlighting the quality craftsmanship evident in every corner.

Don't miss this exceptional opportunity. Contact us today to schedule your private viewing.`
}

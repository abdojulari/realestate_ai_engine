import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const body = await readBody(event)

    const { propertyAddress, beds, baths, sqft, type, features, price, description } = body

    if (!propertyAddress) {
      throw createError({ statusCode: 400, message: 'Property address is required' })
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
      existingDescription: description
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
      propertyAddress, beds, baths, sqft, type, features, price
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

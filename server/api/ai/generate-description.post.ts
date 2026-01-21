import { GoogleGenerativeAI } from '@google/generative-ai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { propertyDetails } = await readBody(event)

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Gemini API key not configured'
    })
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const {
      type,
      bedrooms,
      bathrooms,
      sqft,
      price,
      address,
      features = [],
      neighborhood
    } = propertyDetails

    const prompt = `Generate a compelling property listing description for:
    - Property Type: ${type}
    - Bedrooms: ${bedrooms}
    - Bathrooms: ${bathrooms}
    - Square Feet: ${sqft}
    - Price: $${price}
    - Location: ${address}
    - Neighborhood: ${neighborhood || 'N/A'}
    - Key Features: ${features.join(', ') || 'N/A'}
    
    Create a 2-3 paragraph description that:
    1. Highlights the property's best features
    2. Emphasizes the lifestyle benefits
    3. Mentions the neighborhood appeal
    4. Uses persuasive but honest language
    5. Is around 300-400 words
    
    Make it professional, engaging, and suitable for MLS listings.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const description = response.text().trim()

    return {
      success: true,
      description
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate description'
    })
  }
})


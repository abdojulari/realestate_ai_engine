import { GoogleGenerativeAI } from '@google/generative-ai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { marketData } = await readBody(event)

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
      averagePrice,
      medianPrice,
      totalListings,
      daysOnMarket,
      priceChange,
      area
    } = marketData

    const prompt = `Generate a brief market insight based on these statistics:
    - Area: ${area}
    - Average Price: $${averagePrice}
    - Median Price: $${medianPrice}
    - Total Active Listings: ${totalListings}
    - Average Days on Market: ${daysOnMarket}
    - Price Change (last month): ${priceChange}%
    
    Create a 2-3 sentence insight that:
    1. Interprets what these numbers mean
    2. Provides actionable advice for buyers or sellers
    3. Is professional and data-driven
    4. Keeps it under 200 words
    
    Focus on trends and opportunities.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const insight = response.text().trim()

    return {
      success: true,
      insight
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate insight'
    })
  }
})


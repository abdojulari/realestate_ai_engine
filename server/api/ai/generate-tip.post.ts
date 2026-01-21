import { GoogleGenerativeAI } from '@google/generative-ai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { category } = await readBody(event)

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Gemini API key not configured'
    })
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `Generate a single, actionable real estate tip about ${category}. 
    Keep it under 150 characters, engaging, and valuable for homebuyers/sellers.
    Make it professional but friendly. Do not use quotes or markdown.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const tip = response.text().trim()

    return {
      success: true,
      tip,
      category
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate tip'
    })
  }
})


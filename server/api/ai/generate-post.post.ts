import { GoogleGenerativeAI } from '@google/generative-ai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { topic, platform = 'facebook' } = await readBody(event)

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Gemini API key not configured'
    })
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const platformGuidelines = {
      facebook: 'engaging and informative, around 200-300 characters',
      threads: 'concise and conversational, under 500 characters',
      instagram: 'visually descriptive and inspiring, around 150-200 characters'
    }

    const prompt = `Create a compelling social media post about ${topic} for ${platform}.
    Make it ${platformGuidelines[platform as keyof typeof platformGuidelines]}.
    Include 5 relevant hashtags for real estate.
    Format: First line is the post text, then a blank line, then hashtags separated by spaces.
    Be professional but personable. Focus on value for homebuyers and sellers.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const generatedText = response.text().trim()

    // Parse the response to separate post text and hashtags
    const parts = generatedText.split('\n\n')
    const text = parts[0] || generatedText
    const hashtagsLine = parts[1] || ''
    const hashtags = hashtagsLine
      .split(/\s+/)
      .filter(tag => tag.startsWith('#'))
      .slice(0, 5)

    return {
      success: true,
      text,
      hashtags,
      platform
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate post'
    })
  }
})


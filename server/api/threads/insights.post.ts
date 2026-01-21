/**
 * Fetch Threads insights and metrics
 */
export default defineEventHandler(async (event) => {
  const { accessToken } = await readBody(event)

  if (!accessToken) {
    throw createError({
      statusCode: 400,
      message: 'Access token is required'
    })
  }

  try {
    // Get Threads metrics
    const response = await fetch(
      `https://graph.threads.net/v1.0/me/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to fetch Threads insights')
    }

    const data = await response.json()

    return {
      success: true,
      insights: data.data || []
    }
  } catch (error: any) {
    console.error('Threads Insights Error:', error)

    // If Threads API is not available, return a helpful message
    if (error.message.includes('Failed to fetch') || error.message.includes('ENOTFOUND')) {
      return {
        success: false,
        error: 'Threads API access not configured. Please ensure your Meta app has Threads permissions and API access.',
        requiresSetup: true
      }
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch Threads insights'
    })
  }
})


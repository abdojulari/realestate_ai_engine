/**
 * Fetch Threads user profile
 * Note: Requires Threads API access from Meta
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
    // Get Threads user ID first
    const userResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
    )

    if (!userResponse.ok) {
      const error = await userResponse.json()
      throw new Error(error.error?.message || 'Failed to fetch Threads profile')
    }

    const userData = await userResponse.json()

    return {
      success: true,
      profile: userData
    }
  } catch (error: any) {
    console.error('Threads API Error:', error)
    
    // If Threads API is not available, return a helpful message
    if (error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Threads API access not configured. Please ensure your Meta app has Threads permissions.',
        requiresSetup: true
      }
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch Threads profile'
    })
  }
})


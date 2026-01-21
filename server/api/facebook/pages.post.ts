/**
 * Fetch Facebook pages that the user manages
 */
export default defineEventHandler(async (event) => {
  const { userAccessToken } = await readBody(event)

  if (!userAccessToken) {
    throw createError({
      statusCode: 400,
      message: 'User access token is required'
    })
  }

  try {
    // Get user's pages
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to fetch pages')
    }

    const data = await response.json()

    // Return array of pages with their access tokens
    return data.data || []
  } catch (error: any) {
    console.error('Facebook API Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch Facebook pages'
    })
  }
})


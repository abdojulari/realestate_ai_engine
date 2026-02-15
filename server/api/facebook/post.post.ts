/**
 * Post content to a Facebook page
 * Supports text and image posts
 */
export default defineEventHandler(async (event) => {
  const { pageId, pageAccessToken, message, imageUrl } = await readBody(event)

  if (!pageId || !pageAccessToken || !message) {
    throw createError({
      statusCode: 400,
      message: 'Page ID, access token, and message are required'
    })
  }

  try {
    let endpoint = `https://graph.facebook.com/v24.0/${pageId}/feed`
    const params = new URLSearchParams({
      message,
      access_token: pageAccessToken
    })

    // If image URL is provided, use photos endpoint instead
    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v24.0/${pageId}/photos`
      params.append('url', imageUrl)
    }

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'POST'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to post to Facebook')
    }

    const data = await response.json()

    return {
      success: true,
      postId: data.id,
      message: 'Successfully posted to Facebook'
    }
  } catch (error: any) {
    console.error('Facebook Post Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to post to Facebook'
    })
  }
})


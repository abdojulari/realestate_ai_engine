/**
 * Create a text-only post on Threads
 * Threads posts are limited to 500 characters
 */
export default defineEventHandler(async (event) => {
  const { accessToken, text } = await readBody(event)

  if (!accessToken || !text) {
    throw createError({
      statusCode: 400,
      message: 'Access token and text are required'
    })
  }

  if (text.length > 500) {
    throw createError({
      statusCode: 400,
      message: 'Threads posts must be 500 characters or less'
    })
  }

  try {
    // Step 1: Create a Threads media container
    const createResponse = await fetch(
      `https://graph.threads.net/v1.0/me/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: text,
          access_token: accessToken
        })
      }
    )

    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(error.error?.message || 'Failed to create Threads post')
    }

    const createData = await createResponse.json()
    const creationId = createData.id

    // Step 2: Publish the post
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/me/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken
        })
      }
    )

    if (!publishResponse.ok) {
      const error = await publishResponse.json()
      throw new Error(error.error?.message || 'Failed to publish Threads post')
    }

    const publishData = await publishResponse.json()

    return {
      success: true,
      threadId: publishData.id,
      message: 'Successfully posted to Threads'
    }
  } catch (error: any) {
    console.error('Threads Post Error:', error)

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
      message: error.message || 'Failed to post to Threads'
    })
  }
})


import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate, getTenantAdminId } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user) || user.id
    const body = await readBody(event)

    const {
      propertyId, content, images, link,
      scheduledFor, postType = 'listing',
      templateImage
    } = body

    if (!content) {
      throw createError({ statusCode: 400, message: 'Post content is required' })
    }

    // Get Facebook integration
    const integration = await prisma.facebookIntegration.findUnique({
      where: { adminId }
    })

    if (!integration || !integration.isActive) {
      throw createError({ statusCode: 400, message: 'Facebook is not connected' })
    }

    // Proactively refresh the user token if it's close to expiry
    await maybeRefreshToken(integration)

    const isTokenValid = integration.tokenExpiry
      ? new Date(integration.tokenExpiry) > new Date()
      : true // if no expiry set, assume valid (page tokens from long-lived user tokens don't expire)

    if (!isTokenValid) {
      // Last resort: try to refresh the token even if it appears expired
      const lastChance = await refreshLongLivedToken(integration.accessToken)
      if (lastChance) {
        const newExpiry = new Date()
        newExpiry.setSeconds(newExpiry.getSeconds() + lastChance.expiresIn)
        await prisma.facebookIntegration.update({
          where: { id: integration.id },
          data: { accessToken: lastChance.token, tokenExpiry: newExpiry }
        })
        integration.accessToken = lastChance.token
        integration.tokenExpiry = newExpiry
      } else {
        throw createError({ statusCode: 401, message: 'Facebook token has expired. Please disconnect and reconnect with a fresh token.' })
      }
    }

    // Create the post record
    const post = await prisma.facebookPost.create({
      data: {
        propertyId,
        content,
        images: images || [],
        link,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        postType,
        createdBy: user.id,
        adminId: getAdminIdForCreate(user)
      }
    })

    // If not scheduled, attempt to post immediately
    if (!scheduledFor) {
      try {
        const fbPostId = await publishToFacebook(integration, content, images, link, templateImage)

        await prisma.facebookPost.update({
          where: { id: post.id },
          data: {
            postId: fbPostId,
            status: 'posted',
            postedAt: new Date()
          }
        })

        return {
          success: true,
          message: 'Posted to Facebook successfully',
          post: { ...post, postId: fbPostId, status: 'posted' }
        }
      } catch (fbError: any) {
        await prisma.facebookPost.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            errorMessage: fbError.message
          }
        })

        return {
          success: false,
          message: 'Failed to post to Facebook: ' + fbError.message,
          post: { ...post, status: 'failed' }
        }
      }
    }

    return {
      success: true,
      message: scheduledFor ? 'Post scheduled successfully' : 'Post saved as draft',
      post
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

const FB_API_VERSION = 'v24.0'

/**
 * Exchange a long-lived user token for a new long-lived token.
 * This extends the token for another ~60 days.
 * Works only if the current token is still valid.
 */
async function refreshLongLivedToken(currentToken: string): Promise<{ token: string; expiresIn: number } | null> {
  const config = useRuntimeConfig()
  const appId = config.public?.facebookAppId
  const appSecret = config.facebookAppSecret

  if (!appId || !appSecret) return null

  try {
    const url =
      `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${encodeURIComponent(appId)}&` +
      `client_secret=${encodeURIComponent(appSecret)}&` +
      `fb_exchange_token=${encodeURIComponent(currentToken)}`

    const res = await fetch(url)
    const data = await res.json() as any

    if (data.access_token) {
      console.log(`[Facebook] Refreshed long-lived token (expires in ${Math.round((data.expires_in || 5184000) / 86400)} days)`)
      return { token: data.access_token, expiresIn: data.expires_in || 5184000 }
    }
    return null
  } catch (e: any) {
    console.error('[Facebook] Token refresh error:', e.message)
    return null
  }
}

/**
 * Proactively refresh the user token if it's within 7 days of expiry.
 * Updates the database with the new token and expiry.
 */
async function maybeRefreshToken(integration: any): Promise<void> {
  if (!integration.tokenExpiry || !integration.accessToken) return

  const now = new Date()
  const expiry = new Date(integration.tokenExpiry)
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (daysUntilExpiry > 7) return // plenty of time

  console.log(`[Facebook] User token expires in ${Math.round(daysUntilExpiry)} days — attempting refresh`)

  const refreshed = await refreshLongLivedToken(integration.accessToken)
  if (refreshed) {
    const newExpiry = new Date()
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshed.expiresIn)

    await prisma.facebookIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: refreshed.token,
        tokenExpiry: newExpiry,
      }
    })

    // Update the in-memory object so the rest of the request uses the new token
    integration.accessToken = refreshed.token
    integration.tokenExpiry = newExpiry

    console.log(`[Facebook] Token refreshed — new expiry: ${newExpiry.toISOString()}`)
  } else {
    console.warn('[Facebook] Could not refresh token — it may expire soon')
  }
}

/**
 * Get a fresh Page Access Token by calling /me/accounts with the user token.
 * This ensures we always post with a proper page-scoped token.
 */
async function getPageToken(userToken: string, pageId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`
    )
    const data = await res.json() as any
    if (data.access_token) {
      console.log(`[Facebook] Got fresh page token for page ${pageId}`)
      return data.access_token
    }
    console.warn('[Facebook] No access_token in page response:', JSON.stringify(data))
    return null
  } catch (e: any) {
    console.error('[Facebook] Failed to get page token:', e.message)
    return null
  }
}

async function publishToFacebook(
  integration: any,
  content: string,
  images?: string[],
  link?: string,
  templateImage?: string
): Promise<string> {
  const pageId = integration.pageId
  const userToken = integration.accessToken

  if (!pageId) {
    throw new Error('Missing Facebook page ID. Please reconnect Facebook.')
  }
  if (!userToken && !integration.pageAccessToken) {
    throw new Error('Missing Facebook access token. Please reconnect Facebook.')
  }

  let postToken = integration.pageAccessToken || userToken
  if (userToken) {
    const freshPageToken = await getPageToken(userToken, pageId)
    if (freshPageToken) {
      postToken = freshPageToken
    }
  }

  console.log(`[Facebook] Posting to page ${pageId}`)

  // If a template image is provided, post as a photo so the styled template appears on Facebook
  if (templateImage) {
    const base64Data = templateImage.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2) + Date.now()

    const parts: Buffer[] = []

    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="source"; filename="post.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    ))
    parts.push(imageBuffer)
    parts.push(Buffer.from('\r\n'))

    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="message"\r\n\r\n` +
      content + '\r\n'
    ))

    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="access_token"\r\n\r\n` +
      postToken + '\r\n'
    ))

    parts.push(Buffer.from(`--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const photoUrl = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/photos`

    console.log(`[Facebook] Uploading template image (${imageBuffer.length} bytes) to ${photoUrl}`)

    const response = await fetch(photoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    })

    const data = await response.json() as any

    if (!response.ok) {
      const fbErr = data.error
      console.error('[Facebook] Photo post failed:', JSON.stringify(fbErr, null, 2))
      handleFacebookError(fbErr, response.status)
    }

    console.log('[Facebook] Photo posted successfully:', data.id || data.post_id)
    return data.id || data.post_id
  }

  // Text-only / link post (fallback when no template image)
  const params = new URLSearchParams()
  params.append('message', content)
  params.append('access_token', postToken)
  if (link) {
    params.append('link', link)
  }

  const url = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/feed`

  const response = await fetch(url, {
    method: 'POST',
    body: params
  })

  const data = await response.json() as any

  if (!response.ok) {
    const fbErr = data.error
    console.error('[Facebook] Post failed:', JSON.stringify(fbErr, null, 2))
    handleFacebookError(fbErr, response.status)
  }

  return data.id
}

function handleFacebookError(fbErr: any, httpStatus: number): never {
  if (fbErr) {
    if (fbErr.code === 190 || fbErr.message?.includes('access token')) {
      throw new Error(
        'Access token expired or invalid. Please disconnect and reconnect Facebook with a fresh token from the Graph API Explorer.'
      )
    }
    if (fbErr.code === 200 || fbErr.code === 10) {
      throw new Error(
        'Insufficient permissions. Your Facebook App may need App Review for the pages_manage_posts permission. ' +
        'If your app is in Live mode, go to developers.facebook.com > Your App > App Review, ' +
        'and either submit pages_manage_posts for review, or switch the app to Development mode ' +
        '(which allows unapproved permissions for app admins).'
      )
    }
    throw new Error(fbErr.message || 'Facebook API error')
  }
  throw new Error('Facebook API returned HTTP ' + httpStatus)
}

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
      scheduledFor, postType = 'listing'
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

    const isTokenValid = integration.tokenExpiry
      ? new Date(integration.tokenExpiry) > new Date()
      : false

    if (!isTokenValid) {
      throw createError({ statusCode: 401, message: 'Facebook token has expired. Please reconnect.' })
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
        const fbPostId = await publishToFacebook(integration, content, images, link)

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
  link?: string
): Promise<string> {
  const pageId = integration.pageId
  const userToken = integration.accessToken

  if (!pageId) {
    throw new Error('Missing Facebook page ID. Please reconnect Facebook.')
  }
  if (!userToken && !integration.pageAccessToken) {
    throw new Error('Missing Facebook access token. Please reconnect Facebook.')
  }

  // Always try to get a fresh page token from the user token.
  // This guarantees we use a proper page-scoped token for posting.
  let postToken = integration.pageAccessToken || userToken
  if (userToken) {
    const freshPageToken = await getPageToken(userToken, pageId)
    if (freshPageToken) {
      postToken = freshPageToken
    }
  }

  console.log(`[Facebook] Posting to page ${pageId}`)

  // Build form-encoded params
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
    throw new Error('Facebook API returned HTTP ' + response.status)
  }

  return data.id
}

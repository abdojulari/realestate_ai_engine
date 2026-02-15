import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'

const prisma = new PrismaClient()

/**
 * Validate a Facebook Page Access Token by calling the Graph API.
 * Returns page info on success, throws on failure.
 */
async function validatePageToken(pageId: string, pageAccessToken: string) {
  // First, verify the token is parseable by Facebook
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(pageAccessToken)}&access_token=${encodeURIComponent(pageAccessToken)}`
  )
  const debugData = await debugRes.json() as any

  if (debugData.error) {
    throw new Error(
      `Invalid token: ${debugData.error.message}. ` +
      'Make sure you are using a Page Access Token (not a Client Token or App Token). ' +
      'Generate one at: https://developers.facebook.com/tools/explorer/'
    )
  }

  // Now verify the token works for the given page
  const pageRes = await fetch(
    `https://graph.facebook.com/v24.0/${pageId}?fields=name,id,access_token&access_token=${encodeURIComponent(pageAccessToken)}`
  )
  const pageData = await pageRes.json() as any

  if (pageData.error) {
    // Provide a user-friendly error depending on the code
    const fbErr = pageData.error
    if (fbErr.code === 190) {
      throw new Error(
        'Token is invalid or expired. Please generate a new Page Access Token from the Graph API Explorer.'
      )
    }
    if (fbErr.code === 100 || fbErr.type === 'GraphMethodException') {
      throw new Error(
        `Page ID "${pageId}" was not found. Make sure you are using the Page ID (not the App ID). ` +
        'You can find your Page ID in your Facebook Page settings under "About".'
      )
    }
    throw new Error(`Facebook API error: ${fbErr.message}`)
  }

  return pageData
}

/**
 * Fetch pages accessible by a User Access Token.
 * This lets users connect via a User token and pick a page automatically.
 */
async function fetchUserPages(userAccessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userAccessToken)}`
  )
  const data = await res.json() as any

  if (data.error) {
    return null // Not a valid user token, fall through to page-token validation
  }

  return data.data as Array<{ id: string; name: string; access_token: string }> | null
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user) || user.id
    const body = await readBody(event)

    let { accessToken, pageAccessToken, pageId, pageName, userId, userName, permissions } = body

    if (!accessToken && !pageAccessToken) {
      throw createError({ statusCode: 400, message: 'An access token is required' })
    }

    const token = pageAccessToken || accessToken

    // --- Strategy 1: Token might be a User Access Token ----
    // Try fetching pages; if it works, the user provided a User token
    // and we can auto-discover page ID + page-specific token.
    const pages = await fetchUserPages(token)

    if (pages && pages.length > 0) {
      // If caller specified a pageId, find that page; otherwise use the first one
      const matchedPage = pageId
        ? pages.find(p => p.id === pageId)
        : pages[0]

      if (!matchedPage) {
        throw createError({
          statusCode: 400,
          message: `The token has access to these pages: ${pages.map(p => `${p.name} (${p.id})`).join(', ')}. ` +
            `The Page ID "${pageId}" was not found among them.`
        })
      }

      // Use the page-specific token returned by the API
      pageId = matchedPage.id
      pageName = matchedPage.name || pageName
      pageAccessToken = matchedPage.access_token
      accessToken = token
    } else {
      // --- Strategy 2: Token is a Page Access Token ---
      if (!pageId) {
        throw createError({
          statusCode: 400,
          message: 'Page ID is required when using a Page Access Token.'
        })
      }

      // Validate the page token against the Graph API
      const pageInfo = await validatePageToken(pageId, token)
      pageName = pageInfo.name || pageName
      pageAccessToken = token
      accessToken = token
    }

    // Check permissions using the ORIGINAL user token (not the derived page token).
    // /me/permissions only returns user-level permissions when called with a user token.
    // For page tokens, we skip the permission pre-check and instead do a live test post.
    const userToken = accessToken // the original token the user provided
    const debugRes = await fetch(
      `https://graph.facebook.com/v24.0/me/permissions?access_token=${encodeURIComponent(userToken)}`
    )
    const debugData = await debugRes.json() as any

    if (debugData.data && Array.isArray(debugData.data) && debugData.data.length > 0) {
      const grantedPerms = (debugData.data as any[])
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission)

      // Only check if we actually got meaningful permissions back
      // (page tokens may return an empty list or different structure)
      if (grantedPerms.length > 0) {
        const missingPerms: string[] = []
        if (!grantedPerms.includes('pages_manage_posts')) missingPerms.push('pages_manage_posts')
        if (!grantedPerms.includes('pages_read_engagement')) missingPerms.push('pages_read_engagement')

        if (missingPerms.length > 0) {
          throw createError({
            statusCode: 400,
            message:
              `Your token is missing required permissions: ${missingPerms.join(', ')}. ` +
              'In the Graph API Explorer, click "Add a Permission", add the missing ones, ' +
              'then click "Generate Access Token" again to get a NEW token with those permissions.'
          })
        }
      }
    }

    // Do a live test: try to read the page with the PAGE token to confirm it works
    const testRes = await fetch(
      `https://graph.facebook.com/v24.0/${pageId}?fields=name,id&access_token=${encodeURIComponent(pageAccessToken)}`
    )
    const testData = await testRes.json() as any
    if (testData.error) {
      throw createError({
        statusCode: 400,
        message: `Cannot access page with this token: ${testData.error.message}`
      })
    }

    // Calculate token expiry (Facebook long-lived tokens last ~60 days)
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 60)

    const integration = await prisma.facebookIntegration.upsert({
      where: { adminId },
      update: {
        accessToken,
        pageAccessToken,
        pageId,
        pageName,
        userId,
        userName,
        permissions: permissions || [],
        tokenExpiry,
        isActive: true,
      },
      create: {
        adminId,
        accessToken,
        pageAccessToken,
        pageId,
        pageName,
        userId,
        userName,
        permissions: permissions || [],
        tokenExpiry,
        isActive: true,
      }
    })

    return {
      success: true,
      message: `Facebook connected successfully to page "${pageName}" (ID: ${pageId})`,
      pageName: integration.pageName,
      pageId: integration.pageId,
      tokenExpiry: integration.tokenExpiry
    }
  } catch (error: any) {
    console.error('[Facebook Connect]', error.message)
    throw createError({
      statusCode: error.statusCode || 400,
      message: error.message || 'Failed to connect Facebook. Please check your credentials.'
    })
  }
})

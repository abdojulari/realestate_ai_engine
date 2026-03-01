import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

const FB_API_VERSION = 'v24.0'

/**
 * Test Facebook connection by checking token validity, permissions, and posting ability.
 * Returns detailed diagnostics to help users fix issues.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getTenantAdminId(user) || user.id

  const integration = await prisma.facebookIntegration.findUnique({
    where: { adminId }
  })

  if (!integration || !integration.isActive) {
    return { success: false, message: 'Facebook is not connected' }
  }

  const results: Record<string, any> = {
    pageId: integration.pageId,
    pageName: integration.pageName,
    hasPageToken: !!integration.pageAccessToken,
    hasUserToken: !!integration.accessToken,
    tokenExpiry: integration.tokenExpiry,
  }

  const pageToken = integration.pageAccessToken || integration.accessToken

  // Test 1: Check if the token can access the page
  try {
    const pageRes = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${integration.pageId}?fields=name,id&access_token=${encodeURIComponent(pageToken)}`
    )
    const pageData = await pageRes.json() as any
    if (pageData.error) {
      results.pageAccess = { ok: false, error: pageData.error.message }
    } else {
      results.pageAccess = { ok: true, name: pageData.name, id: pageData.id }
    }
  } catch (e: any) {
    results.pageAccess = { ok: false, error: e.message }
  }

  // Test 2: Check token debug info
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(pageToken)}`
    )
    const debugData = await debugRes.json() as any
    if (debugData.error) {
      results.tokenIdentity = { ok: false, error: debugData.error.message }
    } else {
      results.tokenIdentity = {
        ok: true,
        id: debugData.id,
        name: debugData.name,
        isPageToken: debugData.id === integration.pageId,
      }
    }
  } catch (e: any) {
    results.tokenIdentity = { ok: false, error: e.message }
  }

  // Test 3: Check permissions on the user token
  if (integration.accessToken) {
    try {
      const permsRes = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/me/permissions?access_token=${encodeURIComponent(integration.accessToken)}`
      )
      const permsData = await permsRes.json() as any
      if (permsData.data) {
        results.userPermissions = (permsData.data as any[]).map((p: any) => ({
          permission: p.permission,
          status: p.status
        }))
      } else if (permsData.error) {
        results.userPermissions = { error: permsData.error.message }
      }
    } catch (e: any) {
      results.userPermissions = { error: e.message }
    }
  }

  // Test 4: Check permissions on the page token
  if (integration.pageAccessToken) {
    try {
      const permsRes = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/me/permissions?access_token=${encodeURIComponent(integration.pageAccessToken)}`
      )
      const permsData = await permsRes.json() as any
      if (permsData.data) {
        results.pageTokenPermissions = (permsData.data as any[]).map((p: any) => ({
          permission: p.permission,
          status: p.status
        }))
      } else if (permsData.error) {
        results.pageTokenPermissions = { error: permsData.error.message }
      }
    } catch (e: any) {
      results.pageTokenPermissions = { error: e.message }
    }
  }

  // Test 5: Try to get a fresh page token from the user token
  // (this is what the publish function will do)
  if (integration.accessToken && integration.pageId) {
    try {
      const ptRes = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${integration.pageId}?fields=access_token,name&access_token=${encodeURIComponent(integration.accessToken)}`
      )
      const ptData = await ptRes.json() as any
      if (ptData.access_token) {
        results.freshPageToken = { ok: true, hasToken: true }

        // Verify this fresh page token by calling /me
        const meRes = await fetch(
          `https://graph.facebook.com/${FB_API_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(ptData.access_token)}`
        )
        const meData = await meRes.json() as any
        results.freshPageToken.identity = {
          id: meData.id,
          name: meData.name,
          isPageToken: meData.id === integration.pageId,
        }
      } else {
        results.freshPageToken = { ok: false, error: ptData.error?.message || 'No access_token returned' }
      }
    } catch (e: any) {
      results.freshPageToken = { ok: false, error: e.message }
    }
  }

  // Determine overall status and advice
  const advice: string[] = []

  if (!results.pageAccess?.ok) {
    advice.push('Cannot access the Facebook page. The token may be expired or the page ID is wrong.')
  }

  // Check fresh page token
  if (results.freshPageToken?.ok && results.freshPageToken?.identity?.isPageToken) {
    advice.push('Page token can be derived from your user token - posting should work.')
  } else if (results.freshPageToken?.ok && !results.freshPageToken?.identity?.isPageToken) {
    advice.push(
      'Got a token for the page but it still resolves to the user. ' +
      'This usually means the Facebook App needs App Review for pages_manage_posts. ' +
      'Go to developers.facebook.com > Your App > Use Cases > and make sure pages_manage_posts is approved, ' +
      'or switch the app to Development mode (Settings > Basic > App Mode).'
    )
  }

  const hasManagePosts = results.userPermissions?.some?.((p: any) => p.permission === 'pages_manage_posts' && p.status === 'granted')
  const hasReadEngagement = results.userPermissions?.some?.((p: any) => p.permission === 'pages_read_engagement' && p.status === 'granted')

  if (results.userPermissions && Array.isArray(results.userPermissions)) {
    if (!hasManagePosts) {
      advice.push('User token is missing pages_manage_posts permission. Add it in Graph API Explorer and regenerate the token.')
    }
    if (!hasReadEngagement) {
      advice.push('User token is missing pages_read_engagement permission. Add it in Graph API Explorer and regenerate the token.')
    }
    if (hasManagePosts && hasReadEngagement) {
      advice.push('User token has both required permissions (pages_manage_posts + pages_read_engagement).')
    }
  }

  if (advice.length === 0 && results.pageAccess?.ok) {
    advice.push('Connection looks good.')
  }

  // If everything checks out but posting still fails, suggest app mode
  if (hasManagePosts && hasReadEngagement && results.pageAccess?.ok) {
    advice.push(
      'If posting still fails with permission errors, your Facebook App may be in Live mode ' +
      'without App Review approval for pages_manage_posts. Either submit it for App Review, ' +
      'or temporarily switch to Development mode in your app settings at developers.facebook.com.'
    )
  }

  return {
    success: results.pageAccess?.ok || false,
    results,
    advice
  }
})

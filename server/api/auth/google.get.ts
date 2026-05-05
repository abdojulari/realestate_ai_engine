import { defineEventHandler, setCookie } from 'h3'
import crypto from 'node:crypto'
import {
  getCanonicalCallbackOrigin,
  isAllowedTenantOrigin,
  signOAuthState,
} from '../../utils/oauthCallback'

/**
 * Google OAuth start endpoint.
 *
 * Two operating modes — selected by whether `OAUTH_CANONICAL_HOST` is set:
 *
 *   1. Canonical mode (multi-tenant SaaS): every tenant subdomain hits this
 *      endpoint, but the `redirect_uri` we send to Google is always
 *      `${OAUTH_CANONICAL_HOST}/api/auth/google/callback`. The originating
 *      tenant origin is HMAC-encoded into the OAuth `state` so the callback
 *      can bounce the JWT back to the right subdomain. Result: ONE entry
 *      in Google Cloud Console covers unlimited tenant subdomains.
 *
 *   2. Per-host mode (legacy / single-domain): redirect_uri is built from
 *      the request's own Host header, state lives in a cookie. Each
 *      domain must be registered in Google Cloud Console individually.
 *      Kept as the fallback so existing single-domain deployments don't
 *      break when this code lands without the new env vars.
 */
export default defineEventHandler(async (event) => {
  const url = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const tenantOrigin = `${url.protocol}//${url.host}`

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing GOOGLE_CLIENT_ID' }), { status: 500 })
  }

  const canonical = getCanonicalCallbackOrigin()
  const nonce = crypto.randomBytes(16).toString('hex')

  let redirectUri: string
  let state: string

  if (canonical) {
    // Reject early when the originating host isn't on our allowlist.
    // Defends against someone pointing a foreign domain at our IP and
    // using us as an open redirect via OAuth.
    if (!isAllowedTenantOrigin(tenantOrigin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403 })
    }
    redirectUri = `${canonical}/api/auth/google/callback`
    state = signOAuthState({ tenantOrigin, nonce })
  } else {
    redirectUri = `${tenantOrigin}/api/auth/google/callback`
    state = nonce
    // Cookie state is fine here because per-host mode means the callback
    // lands on the same origin — the cookie survives. In canonical mode
    // it wouldn't (different origin), which is why we use signed state
    // there instead.
    setCookie(event, 'oauth_state', nonce, { path: '/', httpOnly: true, sameSite: 'lax' })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    include_granted_scopes: 'true',
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return Response.redirect(authUrl, 302)
})

import { defineEventHandler, getQuery, getCookie, createError, setCookie } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import {
  getCanonicalCallbackOrigin,
  getCookieDomain,
  isAllowedTenantOrigin,
  verifyOAuthState,
} from '../../../utils/oauthCallback'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * Google OAuth callback. See server/api/auth/google.get.ts for the two-mode
 * design (canonical vs per-host). This handler accepts EITHER style of
 * `state` so a deploy that switches modes mid-flight doesn't strand
 * in-flight users:
 *
 *   • Canonical state: HMAC-signed, contains the originating tenant origin.
 *     We're guaranteed to be on the canonical host. After we mint the JWT,
 *     we 302 the user back to their original tenant subdomain with the
 *     token in the URL fragment.
 *
 *   • Per-host state: opaque random string that must match the
 *     `oauth_state` cookie set during /api/auth/google. Same-origin
 *     round-trip, no cross-tenant bouncing.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = String(query.code || '')
  const stateStr = String(query.state || '')

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing code' })
  }

  const requestUrl = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`

  // Resolve the originating tenant origin AND the redirect_uri we must
  // present back to Google for token exchange (Google rejects the
  // exchange if redirect_uri doesn't byte-match the one used at /authorize).
  const canonical = getCanonicalCallbackOrigin()
  const verified = canonical ? verifyOAuthState(stateStr) : null

  let tenantOrigin: string
  let redirectUri: string

  if (verified) {
    // Defense in depth: even with a valid signature, the encoded origin
    // must still pass the suffix allowlist before we redirect to it.
    if (!isAllowedTenantOrigin(verified.tenantOrigin)) {
      throw createError({ statusCode: 400, statusMessage: 'Disallowed tenant origin' })
    }
    tenantOrigin = verified.tenantOrigin
    redirectUri = `${canonical}/api/auth/google/callback`
  } else {
    // Legacy per-host flow — state comes from the cookie set on this same origin.
    const expectedState = getCookie(event, 'oauth_state') || ''
    if (!stateStr || stateStr !== expectedState) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid state' })
    }
    tenantOrigin = requestOrigin
    redirectUri = `${requestOrigin}/api/auth/google/callback`
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Google OAuth envs' })
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })
  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    throw createError({ statusCode: 500, statusMessage: `Token exchange failed: ${body}` })
  }
  const tokens = await tokenRes.json() as any

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  })
  if (!infoRes.ok) {
    const body = await infoRes.text()
    throw createError({ statusCode: 500, statusMessage: `Userinfo failed: ${body}` })
  }
  const info = await infoRes.json() as any

  const user = await prisma.user.upsert({
    where: { email: info.email },
    update: {
      firstName: info.given_name || 'Google',
      lastName: info.family_name || 'User',
      provider: 'google',
      providerId: info.sub
    },
    create: {
      email: info.email,
      firstName: info.given_name || 'Google',
      lastName: info.family_name || 'User',
      role: 'user',
      provider: 'google',
      providerId: info.sub
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '1h' })

  // Cookie scope: in canonical mode set the `token` cookie at the parent
  // domain (e.g. `.deelbot.ai`) so it's readable on every tenant
  // subdomain. The URL-fragment delivery below is the primary handoff
  // mechanism (the login page reads `window.location.hash`), but a
  // shared-domain cookie is cheap insurance for layouts that prefer
  // cookie auth on first paint.
  const cookieDomain = canonical ? getCookieDomain() : null
  setCookie(event, 'token', token, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  const redirectTo = `${tenantOrigin}/auth/login#token=${encodeURIComponent(token)}`
  return Response.redirect(redirectTo, 302)
})

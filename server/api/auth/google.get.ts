import { defineEventHandler, setCookie } from 'h3'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const url = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const origin = `${url.protocol}//${url.host}`

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${origin}/api/auth/google/callback`

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing GOOGLE_CLIENT_ID' }), { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  setCookie(event, 'oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax' })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    include_granted_scopes: 'true',
    state
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return Response.redirect(authUrl, 302)
})



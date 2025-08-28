import { defineEventHandler, getQuery, getCookie, createError, setCookie } from 'h3'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  const expectedState = getCookie(event, 'oauth_state') || ''

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing code' })
  }
  if (!state || state !== expectedState) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid state' })
  }

  const url = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const origin = `${url.protocol}//${url.host}`

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Google OAuth envs' })
  }

  // Exchange code for tokens
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

  // Fetch Google userinfo
  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  })
  if (!infoRes.ok) {
    const body = await infoRes.text()
    throw createError({ statusCode: 500, statusMessage: `Userinfo failed: ${body}` })
  }
  const info = await infoRes.json() as any

  // Upsert user
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

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' })

  // Set token cookie for convenience, and redirect to app home with token in hash
  setCookie(event, 'token', token, { path: '/', httpOnly: false, sameSite: 'lax' })
  const redirectTo = `${origin}/auth/login#token=${encodeURIComponent(token)}`
  return Response.redirect(redirectTo, 302)
})



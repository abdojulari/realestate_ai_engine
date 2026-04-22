import type { H3Event } from 'h3'
import { createError } from 'h3'

/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Tokens are single-use — each token may be siteverify'd at most once.
 * Always pass the token straight from the widget callback into the action that needs to be guarded
 * (do not pre-verify in a separate /api/auth/turnstile call and then re-use the same token here).
 */
export async function verifyTurnstileToken(event: H3Event, token: unknown): Promise<void> {
  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Human verification token is required' })
  }

  const config = useRuntimeConfig(event)
  const secretKey = config.turnstileSecretKey
  const verifyUrl = config.turnstileVerifyUrl || 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

  if (!secretKey) {
    console.error('[turnstile] missing NUXT_TURNSTILE_SECRET_KEY')
    throw createError({ statusCode: 500, statusMessage: 'Human verification is not configured on the server' })
  }

  const ip =
    event.headers.get('cf-connecting-ip') ||
    event.headers.get('x-forwarded-for') ||
    ''

  let data: any = null
  try {
    const result = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token, remoteip: ip }),
    })
    data = await result.json()
  } catch (err) {
    console.error('[turnstile] siteverify fetch failed:', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not reach Cloudflare Turnstile' })
  }

  if (!data?.success) {
    throw createError({ statusCode: 403, statusMessage: 'Human verification failed. Please try again.' })
  }
}

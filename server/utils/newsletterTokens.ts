/**
 * Signed tokens for newsletter unsubscribe + open/click tracking links.
 *
 * Signing prevents drive-by tampering — without these, anyone could unsubscribe
 * any address by guessing emails (`?email=victim@x.com`) and any URL crawler
 * could pollute open/click counts by fetching the bare endpoint.
 *
 * We use HMAC-SHA256 with `JWT_SECRET` (already present for auth) as the key.
 * Tokens are NOT encrypted — the payload is base64url-encoded JSON so the
 * recipient endpoint can read `subscriberId` / `newsletterId` without a DB
 * round-trip — but they ARE integrity-protected.
 */

import { createHmac, timingSafeEqual } from 'crypto'

const VERSION = 'v1'

function secret(): string {
  return process.env.JWT_SECRET || 'fallback-secret'
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4)
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  return Buffer.from(b64, 'base64')
}

function sign(payload: string): string {
  return base64UrlEncode(createHmac('sha256', secret()).update(payload).digest())
}

export interface UnsubscribeTokenPayload {
  t: 'u'
  sid: number
  aid: number
}

export interface TrackOpenTokenPayload {
  t: 'o'
  sid: number
  nid: number
  aid: number
}

export interface TrackClickTokenPayload {
  t: 'c'
  sid: number
  nid: number
  aid: number
}

export type NewsletterTokenPayload =
  | UnsubscribeTokenPayload
  | TrackOpenTokenPayload
  | TrackClickTokenPayload

export function signNewsletterToken(payload: NewsletterTokenPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload))
  const sig = sign(`${VERSION}.${body}`)
  return `${VERSION}.${body}.${sig}`
}

/**
 * Returns the decoded payload, or null if the token is malformed, tampered
 * with, or of the wrong `t` kind. Use `expectKind` to narrow the type.
 */
export function verifyNewsletterToken<T extends NewsletterTokenPayload['t']>(
  token: string | null | undefined,
  expectKind: T
): Extract<NewsletterTokenPayload, { t: T }> | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [version, body, sig] = parts
  if (version !== VERSION || !body || !sig) return null

  const expected = sign(`${version}.${body}`)
  const a = base64UrlDecode(sig)
  const b = base64UrlDecode(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(body).toString('utf8')) as NewsletterTokenPayload
    if (parsed.t !== expectKind) return null
    return parsed as Extract<NewsletterTokenPayload, { t: T }>
  } catch {
    return null
  }
}

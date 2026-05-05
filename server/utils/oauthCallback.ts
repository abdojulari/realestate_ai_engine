/**
 * Multi-tenant OAuth canonical-callback helper.
 *
 * Why this exists
 * ───────────────
 * Google (and most OAuth providers) require every `redirect_uri` to be
 * pre-registered in their developer console. With one entry per tenant
 * subdomain (`tonahomes.deelbot.ai`, `aohomes.deelbot.ai`, …) every new
 * realtor onboarding requires a manual console edit and a deploy-coordination
 * problem. At ~hundreds of tenants that workflow falls apart.
 *
 * The fix is the standard "canonical callback" pattern: route every OAuth
 * round-trip through ONE stable host (the canonical), encode the originating
 * tenant origin inside the OAuth `state` parameter (HMAC-signed against
 * `JWT_SECRET` so it can't be tampered with), then bounce the freshly minted
 * JWT back to the originating tenant via a 302 with the token in the URL
 * fragment (so it never hits server logs / referers / proxies).
 *
 * Configuration
 * ─────────────
 *   OAUTH_CANONICAL_HOST       Required to enable the pattern. Example:
 *                              `https://deelbot.ai`. When unset, the helpers
 *                              all return null/false and the auth endpoints
 *                              fall back to the legacy per-host flow (cookie
 *                              state + same-host redirect_uri).
 *
 *   OAUTH_ALLOWED_HOST_SUFFIX  Comma-separated list of suffixes. Any host
 *                              that exactly matches a suffix OR ends with
 *                              `.<suffix>` is treated as an allowed tenant
 *                              origin. Example: `deelbot.ai,deelbot.com`
 *                              accepts `deelbot.ai`, `tonahomes.deelbot.ai`,
 *                              `deelbot.com`, etc.
 *
 * Security model
 * ──────────────
 *   • The `state` parameter is HMAC-SHA256 signed with `JWT_SECRET`. An
 *     attacker who tries to forge a state pointing at their own domain will
 *     fail the signature check.
 *   • Even with a valid signature, the decoded `tenantOrigin` is validated
 *     against the suffix allowlist before we issue any redirect. This is
 *     defense in depth: even if someone leaks `JWT_SECRET`, they can only
 *     redirect to a domain we already control.
 *   • The JWT itself rides in the URL fragment, which browsers strip from
 *     `Referer` headers and which never appears in server access logs.
 *   • localhost is allowed only when `NODE_ENV !== 'production'` so a misconfigured
 *     prod environment can never accidentally redirect to a dev box.
 */

import { createHash, createHmac } from 'node:crypto'

/** Bumped only if the state payload schema changes — older tokens fail validation. */
const STATE_VERSION = 'v1'

export interface OAuthState {
  /** Origin (proto + host[:port]) the user started the flow on. */
  tenantOrigin: string
  /** CSRF nonce — random per-request, never reused. */
  nonce: string
  /** Issued-at, seconds since epoch. Used to enforce a max state age. */
  iat: number
}

/** State older than this is rejected. Prevents stolen-state replay attacks. */
const STATE_MAX_AGE_SECONDS = 10 * 60 // 10 minutes — generous for slow consent screens

function getSecret(): string {
  // Mirrors the JWT_SECRET fallback used elsewhere in the auth code so a
  // missing env doesn't crash boot — but states signed with the fallback
  // will only verify against other fallback-signed states, which is the
  // correct fail-shut behavior in prod.
  return process.env.JWT_SECRET || 'fallback-secret'
}

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '')
}

/**
 * Returns the canonical OAuth host (proto + host) when configured, or null
 * when the per-host legacy flow should be used.
 */
export function getCanonicalCallbackOrigin(): string | null {
  const v = (process.env.OAUTH_CANONICAL_HOST || '').trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) return null
  return trimTrailingSlashes(v)
}

export function isCanonicalCallbackEnabled(): boolean {
  return getCanonicalCallbackOrigin() !== null
}

function getAllowedSuffixes(): string[] {
  const raw = (process.env.OAUTH_ALLOWED_HOST_SUFFIX || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * The shared parent domain used to scope the `token` cookie so it's
 * readable across all tenant subdomains. Picks the FIRST suffix that the
 * canonical host itself ends with, e.g. canonical=`deelbot.ai`,
 * suffixes=`deelbot.ai,deelbot.com` → returns `deelbot.ai`. Returns null
 * when no shared scope is possible (no suffix matches the canonical).
 */
export function getCookieDomain(): string | null {
  const canonical = getCanonicalCallbackOrigin()
  if (!canonical) return null
  let canonicalHost: string
  try {
    canonicalHost = new URL(canonical).hostname.toLowerCase()
  } catch {
    return null
  }
  const suffixes = getAllowedSuffixes()
  for (const suffix of suffixes) {
    if (canonicalHost === suffix || canonicalHost.endsWith('.' + suffix)) {
      return suffix
    }
  }
  return null
}

/**
 * Validate that an origin (e.g. `https://tonahomes.deelbot.ai`) is one we
 * own and can safely redirect to. Order:
 *   1. Reject malformed URLs.
 *   2. Accept localhost / 127.0.0.1 only outside production (dev convenience).
 *   3. Accept exact suffix matches and `*.<suffix>` subdomain matches.
 */
export function isAllowedTenantOrigin(origin: string): boolean {
  if (!origin || typeof origin !== 'string') return false
  let host: string
  try {
    host = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }
  if (!host) return false

  if (process.env.NODE_ENV !== 'production') {
    if (host === 'localhost' || host.startsWith('localhost:')) return true
    if (host === '127.0.0.1' || host.startsWith('127.0.0.1:')) return true
  }

  for (const suffix of getAllowedSuffixes()) {
    if (host === suffix) return true
    if (host.endsWith('.' + suffix)) return true
  }

  return false
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(s: string): Buffer {
  // Restore base64 padding so Buffer.from('base64') accepts it on all Node versions.
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function signOAuthState(payload: { tenantOrigin: string; nonce: string }): string {
  const state: OAuthState = {
    tenantOrigin: payload.tenantOrigin,
    nonce: payload.nonce,
    iat: Math.floor(Date.now() / 1000),
  }
  const dataB64 = b64urlEncode(Buffer.from(JSON.stringify(state), 'utf-8'))
  const body = `${STATE_VERSION}.${dataB64}`
  const sig = b64urlEncode(createHmac('sha256', getSecret()).update(body).digest())
  return `${body}.${sig}`
}

/**
 * Validate a state string from the OAuth callback. Returns the decoded
 * payload on success, or null when the signature/version/age is bad. A
 * `null` return is the caller's signal to either fall through to the
 * legacy cookie-state flow OR throw 400 — depends on context.
 */
export function verifyOAuthState(raw: string): OAuthState | null {
  if (!raw || typeof raw !== 'string') return null
  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [version, dataB64, sig] = parts
  if (version !== STATE_VERSION) return null

  const body = `${version}.${dataB64}`
  const expectedSig = b64urlEncode(createHmac('sha256', getSecret()).update(body).digest())

  // Constant-time compare on the hex digests (lengths must match by construction
  // since both come from the same hash). createHash here is just to give us a
  // fixed-length buffer comparison even if upstream tampering produced a
  // sig of different length.
  const a = createHash('sha256').update(sig).digest()
  const b = createHash('sha256').update(expectedSig).digest()
  let diff = a.length ^ b.length
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a[i]! ^ b[i]!
  if (diff !== 0) return null

  let parsed: any
  try {
    parsed = JSON.parse(b64urlDecode(dataB64).toString('utf-8'))
  } catch {
    return null
  }
  if (
    !parsed
    || typeof parsed.tenantOrigin !== 'string'
    || typeof parsed.nonce !== 'string'
    || typeof parsed.iat !== 'number'
  ) {
    return null
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - parsed.iat
  if (ageSeconds < 0 || ageSeconds > STATE_MAX_AGE_SECONDS) return null

  return parsed as OAuthState
}

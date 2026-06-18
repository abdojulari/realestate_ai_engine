import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Parse and verify a Facebook `signed_request` payload.
 *
 * Meta uses signed_request to authenticate two server-to-server callbacks
 * that are required for App Review approval:
 *
 *   - Deauthorize Callback URL  →  POST when the user removes our app
 *                                  from facebook.com → Settings → Apps.
 *   - Data Deletion Request URL →  POST when the user requests deletion
 *                                  of all data we hold about them.
 *
 * Both endpoints are PUBLIC (Meta hits them, no JWT in our session), so the
 * signature is the only proof the request really came from Facebook and
 * hasn't been replayed. NEVER skip the HMAC check.
 *
 * Payload shape:
 *   `<base64-urlsafe(sig)>.<base64-urlsafe(json-payload)>`
 *
 * where `sig = HMAC-SHA256(json-payload, FACEBOOK_APP_SECRET)`.
 *
 * See: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

export interface FacebookSignedRequest {
  algorithm: string
  /** Facebook's numeric user id (string of digits). */
  user_id: string
  /** Unix seconds when Facebook signed the request. */
  issued_at?: number
  [key: string]: unknown
}

/**
 * Decode a base64url string (the variant Facebook uses, with `-`/`_` instead
 * of `+`/`/` and no `=` padding) into a Buffer.
 */
function base64UrlDecode(input: string): Buffer {
  // Re-add standard base64 padding so Node's Buffer can decode it.
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64')
}

/**
 * Verify the signed_request HMAC and return the parsed payload.
 *
 * Throws on any tampering, malformed input, missing app secret, or
 * unsupported algorithm. Callers should treat any thrown error as a
 * security failure and respond 400 — never 401/403 (Meta doesn't retry
 * those and we'd lose the deletion notice).
 */
export function parseFacebookSignedRequest(
  signedRequest: string,
  appSecret: string,
): FacebookSignedRequest {
  if (!appSecret) {
    throw new Error('FACEBOOK_APP_SECRET is not configured')
  }
  if (!signedRequest || typeof signedRequest !== 'string') {
    throw new Error('Missing signed_request')
  }

  const parts = signedRequest.split('.')
  if (parts.length !== 2) {
    throw new Error('Malformed signed_request (expected `<sig>.<payload>`)')
  }
  const [encodedSig, encodedPayload] = parts as [string, string]

  // Decode the signature and the payload independently.
  const providedSig = base64UrlDecode(encodedSig)
  const payloadJson = base64UrlDecode(encodedPayload).toString('utf8')

  let payload: FacebookSignedRequest
  try {
    payload = JSON.parse(payloadJson) as FacebookSignedRequest
  } catch {
    throw new Error('signed_request payload is not valid JSON')
  }

  if (payload.algorithm !== 'HMAC-SHA256') {
    throw new Error(
      `Unsupported signed_request algorithm: ${payload.algorithm} (expected HMAC-SHA256)`,
    )
  }

  // Recompute the signature server-side using the ORIGINAL encoded payload
  // string (NOT the re-stringified JSON — Facebook signs the bytes we
  // received on the wire, not our re-encoding of them).
  const expectedSig = createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest()

  // Constant-time comparison to neutralise timing attacks.
  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    throw new Error('signed_request signature mismatch')
  }

  if (!payload.user_id || typeof payload.user_id !== 'string') {
    throw new Error('signed_request payload is missing user_id')
  }

  return payload
}

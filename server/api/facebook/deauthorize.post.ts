import { defineEventHandler, readBody, getHeader, createError, setResponseStatus } from 'h3'
import { PrismaClient } from '@prisma/client'
import { parseFacebookSignedRequest } from '../../utils/facebookSignedRequest'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * POST /api/facebook/deauthorize
 *
 * Meta-required webhook (registered as the "Deauthorize Callback URL" in
 * the DeelBot Facebook App settings). Facebook hits this endpoint when a
 * user removes our app from facebook.com → Settings & Privacy → Settings →
 * Apps and Websites.
 *
 * Auth: this endpoint is PUBLIC by necessity — Facebook's webhooks don't
 * carry our session JWT. The `signed_request` HMAC against
 * FACEBOOK_APP_SECRET is the only proof the request really came from Meta;
 * it MUST be validated before any DB write. See server/utils/facebookSignedRequest.ts.
 *
 * What we do on a valid request:
 *   1. Look up every FacebookIntegration row that belongs to this FB
 *      `user_id` (could be more than one if the same FB user has connected
 *      multiple tenant accounts).
 *   2. Mark each as inactive and null out the access tokens — mirrors the
 *      tenant-initiated /api/admin/facebook/disconnect flow so the FB
 *      account can be re-connected later without orphaning the row.
 *   3. Always return 200 — Meta retries on 5xx, and there's nothing useful
 *      a retry gives us if we've already removed the row.
 *
 * Per Meta's spec, we don't return a body here; the spec only requires a
 * 200 status. (Compare data-deletion.post.ts which DOES return a JSON
 * status URL + confirmation code.)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const appSecret = config.facebookAppSecret

  // Meta posts as application/x-www-form-urlencoded with a single field.
  // readBody normalises this into an object for us.
  const body = await readBody(event).catch(() => null) as
    | { signed_request?: string }
    | null
  const signedRequest = body?.signed_request

  if (!signedRequest) {
    // Meta can also be tested by hitting the URL from a browser; respond
    // gracefully so the developer-console "Test" button sees a 400 with a
    // clear message instead of a stack trace.
    throw createError({ statusCode: 400, message: 'signed_request is required' })
  }

  let payload
  try {
    payload = parseFacebookSignedRequest(signedRequest, appSecret)
  } catch (err: any) {
    console.warn('[Facebook deauthorize] Rejected request:', err.message, {
      ua: getHeader(event, 'user-agent'),
    })
    throw createError({ statusCode: 400, message: 'Invalid signed_request' })
  }

  const fbUserId = payload.user_id

  // Detach every tenant connection for this Facebook user. We don't hard-
  // delete the row so post history (FacebookPost) keeps its foreign-key
  // pointer intact — the tenant can still see their old posts in the
  // dashboard even after a FB-side deauthorize.
  const affected = await prisma.facebookIntegration.updateMany({
    where: { userId: fbUserId },
    data: {
      isActive: false,
      accessToken: null,
      pageAccessToken: null,
    },
  })

  console.log(
    `[Facebook deauthorize] FB user ${fbUserId} → ${affected.count} integration row(s) deactivated`,
  )

  // Meta expects 200 OK with an empty (or near-empty) body.
  setResponseStatus(event, 200)
  return { ok: true }
})

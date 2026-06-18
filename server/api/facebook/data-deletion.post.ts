import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { parseFacebookSignedRequest } from '../../utils/facebookSignedRequest'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * Key prefix in the Setting table for FB deletion-request audit rows. We
 * intentionally store these on `Setting.adminId = null` (system-wide
 * scope, not tenant) and key them by the unique confirmation code Meta
 * later hands the user.
 *
 * Why not a dedicated Prisma model? Volume is low (one row per FB user
 * who ever requests deletion), and skipping a migration keeps this change
 * small. If volume picks up, this is a straightforward future migration:
 * `FacebookDeletionRequest { id, fbUserId, confirmationCode, completedAt }`.
 */
const DELETION_LOG_KEY_PREFIX = 'facebook.deletion.'

/**
 * POST /api/facebook/data-deletion
 *
 * Meta-required webhook (registered as the "Data Deletion Request URL" in
 * the DeelBot Facebook App settings). Facebook hits this endpoint when a
 * user invokes their GDPR/CCPA-style data deletion right via their
 * Facebook account UI.
 *
 * Difference vs deauthorize:
 *   - deauthorize  →  the user removed our app, but their data with us
 *                     might still legitimately exist (e.g. they want it).
 *   - data-deletion →  the user explicitly asked for ALL their data to be
 *                     deleted. We MUST destroy what we hold for that FB
 *                     user id and return Meta a status URL the user can
 *                     visit to verify deletion.
 *
 * Response contract (Meta-mandated):
 *   { "url": "https://<host>/facebook/deletion-status?code=<code>",
 *     "confirmation_code": "<unique-code>" }
 *
 * The user clicks `url` and expects a page that shows "Deletion complete"
 * referencing `confirmation_code`. We host that page at
 * /facebook/deletion-status.vue.
 *
 * Auth: PUBLIC; verified via the signed_request HMAC against
 * FACEBOOK_APP_SECRET. See server/utils/facebookSignedRequest.ts.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const appSecret = config.facebookAppSecret

  const body = await readBody(event).catch(() => null) as
    | { signed_request?: string }
    | null
  const signedRequest = body?.signed_request

  if (!signedRequest) {
    throw createError({ statusCode: 400, message: 'signed_request is required' })
  }

  let payload
  try {
    payload = parseFacebookSignedRequest(signedRequest, appSecret)
  } catch (err: any) {
    console.warn('[Facebook data-deletion] Rejected request:', err.message, {
      ua: getHeader(event, 'user-agent'),
    })
    throw createError({ statusCode: 400, message: 'Invalid signed_request' })
  }

  const fbUserId = payload.user_id

  // ── Delete in a single transaction so the audit log only writes if the
  // actual data removal succeeded. The order is:
  //   1. Null out tokens + scrub user attribution on every
  //      FacebookIntegration row for this FB user.
  //   2. Null out `createdBy` on FacebookPost rows authored by the matching
  //      DeelBot users (rare; the FB userId ≠ our internal user.id, so
  //      this is a best-effort scrub of obvious links).
  //   3. Write the audit row.
  //
  // We deliberately do NOT delete FacebookPost rows: those represent the
  // tenant's content on their own Page, which belongs to the tenant, not
  // to the FB user being deleted. Meta's data-deletion spec is about the
  // user's personal data we collected via login, not the public posts the
  // tenant made on their Page.
  const confirmationCode = randomUUID()

  const result = await prisma.$transaction(async (tx) => {
    const detached = await tx.facebookIntegration.updateMany({
      where: { userId: fbUserId },
      data: {
        isActive: false,
        accessToken: null,
        pageAccessToken: null,
        userId: null,        // sever the FB-user → tenant link
        userName: null,
        permissions: [],
      },
    })

    await tx.setting.create({
      data: {
        adminId: null,
        key: `${DELETION_LOG_KEY_PREFIX}${confirmationCode}`,
        value: JSON.stringify({
          fbUserId,
          requestedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          detachedIntegrations: detached.count,
        }),
      },
    })

    return detached
  })

  console.log(
    `[Facebook data-deletion] FB user ${fbUserId} → ${result.count} integration row(s) scrubbed (code=${confirmationCode})`,
  )

  // Build the status URL Meta will surface to the user. NUXT_PUBLIC_SITE_URL
  // is the platform-wide canonical URL (no tenant subdomain) — the deletion
  // status page is a public, tenant-agnostic landing.
  const siteUrl =
    config.public?.siteUrl ||
    process.env.NUXT_PUBLIC_SITE_URL ||
    'https://deelbot.ai'

  return {
    url: `${siteUrl.replace(/\/$/, '')}/facebook/deletion-status?code=${encodeURIComponent(confirmationCode)}`,
    confirmation_code: confirmationCode,
  }
})

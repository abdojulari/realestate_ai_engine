import { defineEventHandler, readBody, createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { sendEmail } from '../../../utils/email'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

const REQUEST_KEY_PREFIX = 'facebook.access-request.'
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/facebook/request-access
 *
 * Bridge endpoint for the gap between *now* and *Meta-approved*. While the
 * DeelBot FB App is still in Development or pending App Review, a tenant
 * whose Facebook account isn't on our App Roles list can't grant the
 * posting scopes — `FB.login()` returns no token (see the
 * 'not_authorized' branch in app/composables/useFacebookAuth.ts).
 *
 * This endpoint accepts the tenant's Facebook account details so the
 * platform admin can whitelist them as a Tester on the FB App
 * (developers.facebook.com → DeelBot App → App Roles → Add People → Tester
 * → invite by email).
 *
 * Storage: we write into the existing `Setting` table with
 *   adminId: null         (system-wide; not tenant-owned data)
 *   key:     facebook.access-request.<uuid>
 *   value:   JSON({ requestedBy, requestedAt, fbEmail, fbProfileUrl, notes, … })
 *
 * Side effect: emails the platform admin at FACEBOOK_REVIEW_NOTIFY_EMAIL
 * (or SMTP_SENDER if that var isn't set) so they see new requests without
 * having to poll a dashboard. Email failures are logged but don't block
 * the request — the audit row is still written.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getTenantAdminId(user) || user.id

  const body = await readBody(event).catch(() => null) as
    | { fbEmail?: string; fbProfileUrl?: string; notes?: string }
    | null

  const fbEmail = (body?.fbEmail || '').trim()
  if (!fbEmail || !EMAIL_RX.test(fbEmail)) {
    throw createError({
      statusCode: 400,
      message: 'A valid Facebook account email is required so we can whitelist it.',
    })
  }

  // Truncate notes defensively — Setting.value is a free-text column but
  // we don't need a tenant pasting an essay here, and the audit email
  // gets weird at >5KB.
  const fbProfileUrl = String(body?.fbProfileUrl || '').slice(0, 500)
  const notes = String(body?.notes || '').slice(0, 2000)

  const requestId = randomUUID()
  const requestedAt = new Date().toISOString()

  await prisma.setting.create({
    data: {
      adminId: null,
      key: `${REQUEST_KEY_PREFIX}${requestId}`,
      value: JSON.stringify({
        requestId,
        requestedAt,
        requestedByUserId: user.id,
        requestedByAdminId: adminId,
        requestedByEmail: user.email,
        requestedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        fbEmail,
        fbProfileUrl: fbProfileUrl || null,
        notes: notes || null,
        status: 'pending',
      }),
    },
  })

  // Notify the platform admin. Configurable destination so it can be
  // separated from generic SMTP_SENDER in production.
  const notifyTo =
    process.env.FACEBOOK_REVIEW_NOTIFY_EMAIL ||
    process.env.SMTP_SENDER ||
    null

  if (notifyTo) {
    const html = `
      <h2>New Facebook Access Request</h2>
      <p>A tenant is asking to be whitelisted as a Tester on the DeelBot Facebook App.</p>
      <table cellpadding="6" style="border-collapse: collapse; font-family: -apple-system, sans-serif;">
        <tr><td><strong>Request ID</strong></td><td><code>${requestId}</code></td></tr>
        <tr><td><strong>Tenant user</strong></td><td>${escapeHtml(user.email)} (id ${user.id})</td></tr>
        <tr><td><strong>Tenant adminId</strong></td><td>${adminId}</td></tr>
        <tr><td><strong>FB account email</strong></td><td>${escapeHtml(fbEmail)}</td></tr>
        <tr><td><strong>FB profile URL</strong></td><td>${fbProfileUrl ? `<a href="${escapeHtml(fbProfileUrl)}">${escapeHtml(fbProfileUrl)}</a>` : '<em>not provided</em>'}</td></tr>
        <tr><td><strong>Notes</strong></td><td>${notes ? escapeHtml(notes).replace(/\n/g, '<br>') : '<em>none</em>'}</td></tr>
        <tr><td><strong>Requested at</strong></td><td>${requestedAt}</td></tr>
      </table>
      <p style="margin-top: 16px;">
        To approve: go to <a href="https://developers.facebook.com/apps/">developers.facebook.com/apps/</a> → DeelBot App → App Roles → Add People → Tester, invite <code>${escapeHtml(fbEmail)}</code>.
      </p>
      <p style="color: #888; font-size: 12px;">
        This is an interim flow valid only until the DeelBot FB App passes Meta App Review for
        <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, and
        <code>pages_show_list</code>. After approval, every Facebook user can connect without whitelisting.
      </p>
    `
    void sendEmail({
      to: notifyTo,
      subject: `[DeelBot] Facebook access request from ${user.email}`,
      html,
    }).catch((err) => {
      console.warn('[Facebook request-access] notification email failed:', err?.message)
    })
  } else {
    console.warn(
      '[Facebook request-access] No FACEBOOK_REVIEW_NOTIFY_EMAIL / SMTP_SENDER configured — request saved but no email sent.',
    )
  }

  return {
    success: true,
    requestId,
    message:
      "Thanks — your request has been logged. We'll whitelist your Facebook account within one business day and email you when it's ready.",
  }
})

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

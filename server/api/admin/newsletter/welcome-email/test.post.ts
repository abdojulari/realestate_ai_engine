import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { requireFeature, FEATURES } from '../../../../utils/license'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import {
  loadTenantBranding,
  loadWelcomeOverrides,
  renderWelcomeEmailHtml,
} from '../../../../utils/newsletterWelcomeEmail'
import { getTenantSiteUrl } from '../../../../utils/tenantSiteUrl'
import { sendEmailDetailed, isValidEmail } from '../../../../utils/email'

/**
 * Send a one-off test of the welcome email to an admin-supplied address.
 *
 * Use cases:
 *  • Sanity-check what subscribers will receive (deliverability + look)
 *  • Verify per-tenant From / Reply-To routing in the recipient inbox
 *  • Confirm tenant SMTP/MailerLite outbound settings work end-to-end
 *
 * Notes:
 *  • Honors the same draft-vs-saved override logic as the preview endpoint
 *    so an admin can test pending unsaved changes.
 *  • Does NOT respect the `enabled` toggle — tests are explicit user
 *    actions; an admin disabling the welcome email shouldn't suddenly
 *    lose the ability to send a test of what it would look like.
 *  • Uses `unsubscribeLink: null` — there's no real subscriber row to
 *    sign for. The footer renders a non-clickable "Unsubscribe" label.
 *  • Returns the delivery channel ("smtp" or "mailerlite") so the UI can
 *    show "Sent via MailerLite" instead of guessing.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeature(FEATURES.NEWSLETTER, event)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const rawTo = typeof body?.to === 'string' ? body.to.trim() : ''
  // Default to the admin's own email when they don't specify one — common
  // case is the admin just clicking "Send Test" to their own inbox.
  const to = rawTo || (user.email || '').trim()
  if (!to || !isValidEmail(to)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide a valid recipient email address for the test.',
    })
  }

  const flavor: 'new' | 'reactivation' = body?.flavor === 'reactivation' ? 'reactivation' : 'new'

  const saved = await loadWelcomeOverrides(adminId)
  const subjectFromBody = typeof body?.subject === 'string' ? body.subject.trim() : null
  const introFromBody = typeof body?.intro === 'string' ? body.intro.trim() : null

  const overrides = {
    // Ignore the saved "enabled" flag — see endpoint header doc above.
    enabled: true,
    subject: subjectFromBody !== null
      ? (subjectFromBody.length > 0 ? subjectFromBody : null)
      : saved.subject,
    intro: introFromBody !== null
      ? (introFromBody.length > 0 ? introFromBody : null)
      : saved.intro,
  }

  const [branding, siteUrl] = await Promise.all([
    loadTenantBranding(adminId),
    getTenantSiteUrl(adminId),
  ])

  const subscriber = {
    email: to,
    firstName: (body?.subscriber?.firstName && String(body.subscriber.firstName).trim())
      || user.firstName
      || 'there',
    lastName: (body?.subscriber?.lastName && String(body.subscriber.lastName).trim())
      || user.lastName
      || '',
  }

  const { subject, html } = renderWelcomeEmailHtml({
    branding,
    overrides,
    subscriber,
    flavor,
    siteUrl,
    unsubscribeLink: null,
  })

  // Tag the subject so the admin can spot test emails in their inbox at
  // a glance — never apply this to real subscriber sends.
  const testSubject = `[TEST] ${subject}`

  const result = await sendEmailDetailed({
    to,
    subject: testSubject,
    html,
    adminId,
  })

  if (!result.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Email send failed — check the server logs and your email settings.',
    })
  }

  return {
    success: true,
    sentTo: to,
    deliveredVia: result.deliveredVia,
    mailerLiteSkippedReason: result.mailerLiteSkippedReason,
    subject: testSubject,
  }
})

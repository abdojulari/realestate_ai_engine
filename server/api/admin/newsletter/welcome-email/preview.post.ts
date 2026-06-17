import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { requireFeature, FEATURES } from '../../../../utils/license'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import {
  loadTenantBranding,
  loadWelcomeOverrides,
  renderWelcomeEmailHtml,
} from '../../../../utils/newsletterWelcomeEmail'
import { getTenantSiteUrl } from '../../../../utils/tenantSiteUrl'

/**
 * Render the welcome email HTML using the *draft* values from the admin
 * form, without touching the Setting table. Powers the live preview pane
 * on the Welcome Email settings page so the admin can see their changes
 * before saving.
 *
 * The admin can override:
 *   subject / intro      — from the form body, falls back to saved overrides
 *   flavor               — "new" (default) or "reactivation", lets the
 *                          admin preview both copy variants
 *   subscriber.firstName — display the rendered greeting with a real name
 *                          so the admin can see merge-tag results
 *
 * The unsubscribe link is rendered as a non-clickable placeholder in
 * preview — no real signed token is generated because there's no real
 * subscriber id yet (avoids polluting analytics if the admin clicks).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeature(FEATURES.NEWSLETTER, event)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const flavor: 'new' | 'reactivation' = body?.flavor === 'reactivation' ? 'reactivation' : 'new'

  // Form-level overrides win over saved overrides for preview. This lets
  // the admin type a new subject in the form and see the rendered preview
  // immediately, without saving first.
  const saved = await loadWelcomeOverrides(adminId)
  const subjectFromBody = typeof body?.subject === 'string' ? body.subject.trim() : null
  const introFromBody = typeof body?.intro === 'string' ? body.intro.trim() : null
  const enabledFromBody =
    body?.enabled === true || body?.enabled === 'true' || body?.enabled === 1 || body?.enabled === '1'

  const overrides = {
    enabled: typeof body?.enabled !== 'undefined' ? enabledFromBody : saved.enabled,
    // Empty strings from the form → fall back to platform default in
    // preview just like they would after saving (consistent UX).
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
    email: (body?.subscriber?.email && String(body.subscriber.email).trim())
      || user.email
      || 'preview@example.com',
    firstName: (body?.subscriber?.firstName && String(body.subscriber.firstName).trim())
      || user.firstName
      || 'Alex',
    lastName: (body?.subscriber?.lastName && String(body.subscriber.lastName).trim())
      || user.lastName
      || 'Sample',
  }

  const { subject, html } = renderWelcomeEmailHtml({
    branding,
    overrides,
    subscriber,
    flavor,
    siteUrl,
    unsubscribeLink: null, // non-clickable in preview
  })

  return {
    subject,
    html,
    flavor,
    // Surface what we used so the UI can show "previewing as ..." chips.
    previewSubscriber: subscriber,
    branding,
  }
})

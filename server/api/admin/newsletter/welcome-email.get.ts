import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { getAdminIdForCreate } from '../../../utils/tenant'
import {
  loadTenantBranding,
  loadWelcomeOverrides,
  WELCOME_SETTING_KEYS,
} from '../../../utils/newsletterWelcomeEmail'

/**
 * Welcome-email settings (per tenant).
 *
 * Returns:
 *  • enabled / subject / intro overrides currently saved for this tenant
 *  • the tenant's resolved branding (businessName, logo, color, contact,
 *    socials) — so the admin UI can show a "this is what subscribers will
 *    see" preview even before any overrides are set.
 *  • the merge-tag list the UI advertises to the admin.
 *
 * Tenant scoping comes from `requireAdmin` + `getAdminIdForCreate` — the
 * Setting rows are only ever read/written under the caller's own adminId,
 * so a delegated sub-admin can manage the welcome email for the parent
 * brokerage they're attached to (matches the rest of /api/admin/settings).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeature(FEATURES.NEWSLETTER, event)
  const adminId = getAdminIdForCreate(user)

  const [overrides, branding] = await Promise.all([
    loadWelcomeOverrides(adminId),
    loadTenantBranding(adminId),
  ])

  return {
    settings: {
      enabled: overrides.enabled,
      subject: overrides.subject || '',
      intro: overrides.intro || '',
    },
    branding,
    settingKeys: WELCOME_SETTING_KEYS,
    mergeTags: [
      { tag: '{firstName}', description: "Subscriber's first name (blank if not provided)" },
      { tag: '{lastName}', description: "Subscriber's last name" },
      { tag: '{email}', description: "Subscriber's email address" },
      { tag: '{businessName}', description: "Your brokerage's display name" },
    ],
  }
})

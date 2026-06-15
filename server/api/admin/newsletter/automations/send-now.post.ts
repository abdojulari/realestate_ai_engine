import { requireAdmin } from '../../../../utils/auth'
import { getTenantAdminId } from '../../../../utils/tenant'
import { dispatchNewsletter } from '../../../../utils/newsletterDispatch'
import { normalizeAudience } from '../../../../utils/newsletterAudience'

/**
 * Instant-send endpoint for the Newsletter > Automations page.
 *
 * Used when the admin picks a campaign or template + an audience and clicks
 * "Send Now" instead of scheduling a recurring automation. No automation row
 * is created — this is a one-shot dispatch through the shared helper, which
 * still records a Newsletter + SentNewsletter trail so the metrics dashboard
 * stays accurate.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user)
    if (adminId == null) {
      throw createError({ statusCode: 403, message: 'No tenant context' })
    }

    const body = await readBody(event)
    const result = await dispatchNewsletter({
      adminId,
      createdBy: user.id,
      campaignId: body?.campaignId ? Number(body.campaignId) : null,
      templateId: body?.templateId ? Number(body.templateId) : null,
      subject: body?.subject ?? null,
      content: body?.content ?? null,
      plainTextContent: body?.plainTextContent ?? null,
      name: body?.name ?? null,
      audience: normalizeAudience(body?.audience),
      subscriberIds: Array.isArray(body?.subscriberIds) ? body.subscriberIds : [],
      sourceLabel: 'Instant Send',
    })

    return result
  } catch (error: any) {
    console.error('Error sending newsletter (instant):', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})

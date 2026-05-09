import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { sendEmailDetailed } from '../../../../utils/email'
import { getTenantEmailOutbound } from '../../../../utils/tenantEmailOutbound'

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  const emailSettings = await readBody(event)
  const { fromEmail, fromName, provider, smtp } = emailSettings || {}

  if (!fromEmail || typeof fromEmail !== 'string' || !fromEmail.includes('@')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'From Email is required to send a test message',
    })
  }

  const outbound = await getTenantEmailOutbound(adminId)
  const mailerLiteTokenConfigured = !!process.env.MAILERLITE_API_TOKEN?.trim()
  const outboundLabel = outbound.channel === 'mailerlite' ? 'MailerLite API (saved)' : 'SMTP / platform relay (saved)'
  const tokenLabel = mailerLiteTokenConfigured
    ? 'present on server'
    : 'missing on server — MailerLite sends will fall back to SMTP'

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Email Configuration Test</h2>
          <p>Congratulations! Your email settings are working.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Saved outbound preference:</strong> ${escapeHtml(outboundLabel)}<br>
            <strong>MailerLite API token:</strong> ${escapeHtml(tokenLabel)}<br>
            <strong>Marketing provider label (form field):</strong> ${escapeHtml(provider || '(not set)')}<br>
            <strong>SMTP Host (form):</strong> ${escapeHtml(smtp?.host || '(platform default if blank)')}<br>
            <strong>SMTP Port (form):</strong> ${escapeHtml(String(smtp?.port || '(platform default if blank)'))}<br>
            <strong>From Email:</strong> ${escapeHtml(fromEmail)}<br>
            <strong>From Name:</strong> ${escapeHtml(fromName || '(not set)')}
          </div>
          <p style="color: #666; font-size: 14px;">
            The admin panel toast after you clicked Test shows whether this message was delivered via MailerLite or SMTP fallback.
            Choose MailerLite above and click <strong>Save Changes</strong> before testing so the saved preference matches what you expect.
          </p>
        </div>
      `

  try {
    const result = await sendEmailDetailed({
      to: fromEmail,
      subject: 'Email Settings Test - Success!',
      html,
      adminId,
    })

    if (!result.ok) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send test email — check server logs and SMTP / MailerLite configuration',
      })
    }

    let message = 'Test email sent. Check your inbox.'
    if (result.deliveredVia === 'mailerlite') {
      message += ' Delivered via MailerLite API.'
    } else if (result.mailerLiteSkippedReason) {
      message += ` Delivered via SMTP fallback: ${result.mailerLiteSkippedReason}`
    } else {
      message += ' Delivered via SMTP.'
    }

    return {
      success: true,
      message,
      deliveredVia: result.deliveredVia,
      mailerLiteSkippedReason: result.mailerLiteSkippedReason ?? null,
      savedOutboundChannel: outbound.channel,
      mailerLiteTokenConfigured,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Failed to send test email:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send test email: ${msg}`,
    })
  }
})

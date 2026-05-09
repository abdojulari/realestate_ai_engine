/**
 * Optional SMS via MailerSend (MailerLite ecosystem).
 * MailerLite's connect.mailerlite.com API does not expose SMS; MailerSend does:
 * https://developers.mailersend.com/api/v1/sms.html
 *
 * Used only when the tenant enables "SMS notifications" in Email settings and
 * these env vars are set server-side.
 */

export async function sendMailerSendSms(params: {
  toE164: string[]
  text: string
}): Promise<boolean> {
  const token = process.env.MAILERSEND_API_TOKEN?.trim()
  const from = process.env.MAILERSEND_SMS_FROM_NUMBER?.trim()
  if (!token || !from) {
    console.warn('[sms] MAILERSEND_API_TOKEN / MAILERSEND_SMS_FROM_NUMBER not set')
    return false
  }

  const to = [...new Set(params.toE164.map((t) => t.trim()).filter(Boolean))]
  if (!to.length) return false

  const body = {
    from,
    to,
    text: String(params.text || '').slice(0, 2048),
  }

  try {
    const res = await fetch('https://api.mailersend.com/v1/sms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (res.status !== 202) {
      console.error('[sms] MailerSend SMS failed', res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('[sms] MailerSend SMS error', e)
    return false
  }
}

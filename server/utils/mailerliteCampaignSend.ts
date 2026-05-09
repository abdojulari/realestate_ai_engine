/**
 * Sends one transactional-style message via MailerLite REST API by creating a
 * temporary group, upserting recipients, creating a regular campaign, scheduling
 * instant delivery, then deleting the group after a delay.
 *
 * Docs: https://developers.mailerlite.com/docs/campaigns.html
 * https://developers.mailerlite.com/docs/subscribers.html
 *
 * Limitations:
 * - MailerLite may require verified sender domains / Advanced plan for custom HTML.
 * - Rate limit 120 req/min account-wide — heavy newsletter batches should stay on SMTP.
 */

const BASE = 'https://connect.mailerlite.com/api'

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function ensureUnsubscribeFooter(html: string): string {
  if (/\{\$unsubscribe\}/i.test(html) || /href=["'][^"']*unsubscribe/i.test(html)) {
    return html
  }
  return `${html}<p style="font-size:12px;color:#666;"><a href="{$unsubscribe}">Unsubscribe</a></p>`
}

async function resolveEnglishLanguageId(token: string): Promise<number> {
  try {
    const res = await fetch(`${BASE}/languages`, { headers: headers(token) })
    if (!res.ok) return 4
    const json: any = await res.json()
    const list = json?.data ?? []
    const en = list.find(
      (l: any) =>
        String(l?.short_code || l?.code || '')
          .toLowerCase()
          .startsWith('en'),
    )
    const id = Number(en?.id)
    return Number.isFinite(id) ? id : 4
  } catch {
    return 4
  }
}

export interface MailerLiteSendParams {
  recipients: string[]
  subject: string
  html: string
  text?: string
  fromEmail: string
  fromName: string
  replyTo?: string | null
}

export async function sendViaMailerLiteCampaign(params: MailerLiteSendParams): Promise<boolean> {
  const token = process.env.MAILERLITE_API_TOKEN?.trim()
  if (!token) {
    console.warn('[mailerlite] MAILERLITE_API_TOKEN missing — skipping MailerLite send')
    return false
  }

  const recipients = [...new Set(params.recipients.map((e) => e.trim()).filter(Boolean))]
  if (recipients.length === 0) return false

  const groupName = `Suhani-txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let groupId: string | null = null

  try {
    const gRes = await fetch(`${BASE}/groups`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name: groupName.slice(0, 255) }),
    })
    if (!gRes.ok) {
      console.error('[mailerlite] create group failed', gRes.status, await gRes.text())
      return false
    }
    const gj: any = await gRes.json()
    groupId = String(gj?.data?.id ?? '')
    if (!groupId) return false

    for (const email of recipients) {
      const subRes = await fetch(`${BASE}/subscribers`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          email,
          groups: [groupId],
          status: 'active',
        }),
      })
      if (!subRes.ok && subRes.status !== 422) {
        const errBody = await subRes.text()
        console.error('[mailerlite] subscriber upsert failed', subRes.status, errBody)
        return false
      }
    }

    const languageId = await resolveEnglishLanguageId(token)
    const htmlBody = ensureUnsubscribeFooter(params.html)

    const emailPayload: Record<string, unknown> = {
      subject: params.subject.slice(0, 255),
      from_name: params.fromName.slice(0, 255),
      from: params.fromEmail,
      content: htmlBody,
    }
    if (params.replyTo?.trim()) {
      emailPayload.reply_to = params.replyTo.trim()
    }

    const cRes = await fetch(`${BASE}/campaigns`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        name: groupName.slice(0, 255),
        language_id: languageId,
        type: 'regular',
        emails: [emailPayload],
        groups: [groupId],
      }),
    })
    if (!cRes.ok) {
      console.error('[mailerlite] campaign create failed', cRes.status, await cRes.text())
      return false
    }
    const cj: any = await cRes.json()
    const campaignId = String(cj?.data?.id ?? '')
    if (!campaignId) return false

    const sRes = await fetch(`${BASE}/campaigns/${campaignId}/schedule`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ delivery: 'instant' }),
    })
    if (!sRes.ok) {
      console.error('[mailerlite] schedule failed', sRes.status, await sRes.text())
      return false
    }

    // Delayed cleanup so MailerLite can resolve group membership before delete.
    const gid = groupId
    const hdrs = headers(token)
    const t = setTimeout(() => {
      fetch(`${BASE}/groups/${gid}`, { method: 'DELETE', headers: hdrs }).catch(() => {})
    }, 180_000)
    if (typeof (t as any).unref === 'function') (t as any).unref()

    return true
  } catch (e) {
    console.error('[mailerlite] send error', e)
    return false
  }
}

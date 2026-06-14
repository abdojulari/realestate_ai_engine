import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getTenantSender, getTenantSiteUrl } from './tenantSiteUrl'
import { getTenantEmailOutbound, getTenantMailerLiteFromIdentity } from './tenantEmailOutbound'
import { sendViaMailerLiteCampaign } from './mailerliteCampaignSend'
import { signNewsletterToken } from './newsletterTokens'

export interface SendEmailResult {
  ok: boolean
  deliveredVia?: 'mailerlite' | 'smtp'
  /** Tenant chose MailerLite but this send used SMTP (missing token, API error, etc.). */
  mailerLiteSkippedReason?: string
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  /**
   * Reply-To header — useful for relayed inbox emails (e.g. contact forms,
   * inquiries) where `from` must stay as the verified SMTP sender but you
   * want the realtor's reply to land in the inquirer's inbox.
   */
  replyTo?: string | string[]
  /**
   * Per-tenant identity. When provided AND `from`/`replyTo` aren't
   * explicitly set, we'll derive:
   *   - `From: "<TenantBusinessName>" <SMTP_USERNAME>` (display-name only;
   *     envelope stays on the authenticated SMTP user so Gmail/Workspace
   *     don't reject or rewrite the header).
   *   - `Reply-To: <tenant admin email>` so replies land in the right inbox.
   *
   * Pass `null` (or omit) for platform-wide / cross-tenant emails (e.g.
   * super-admin notifications) — those use the global SMTP_SENDER.
   */
  adminId?: number | null
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer | string
    contentType?: string
  }>
}

/**
 * Transporter cache. Keyed by `host:port:user` so we can hold one
 * platform transport plus N per-tenant transports without leaking. NB:
 * tenant transports are reused across requests and across tenants if
 * they happen to share SMTP credentials (unusual). nodemailer's own
 * connection pool then reuses the underlying TCP connection.
 */
const transporterCache = new Map<string, Transporter>()

/**
 * SMTP settings: prefer process.env (Docker / server) over runtimeConfig, because
 * runtimeConfig.smtp* is resolved at `nuxt build` time unless overridden by NUXT_*.
 */
function smtpHost(config: ReturnType<typeof useRuntimeConfig>) {
  return process.env.SMTP_HOSTNAME || config.smtpHostname || process.env.SMTP_HOST || 'smtp.gmail.com'
}

function smtpPort(config: ReturnType<typeof useRuntimeConfig>) {
  return parseInt(String(process.env.SMTP_PORT || config.smtpPort || '587'), 10)
}

function smtpUser(config: ReturnType<typeof useRuntimeConfig>) {
  return process.env.SMTP_USERNAME || config.smtpUsername || process.env.SMTP_USER || ''
}

function smtpPass(config: ReturnType<typeof useRuntimeConfig>) {
  return process.env.SMTP_PASSWORD || config.smtpPassword || ''
}

/**
 * Get-or-create the platform SMTP transporter.
 *
 * All outbound mail authenticates against the single platform SMTP relay
 * (`SMTP_HOSTNAME` / `SMTP_USERNAME` / `SMTP_PASSWORD` in .env). Per-tenant
 * SMTP overrides are intentionally NOT honored on send — every tenant ships
 * through the same envelope sender, which is what Gmail/Workspace expect
 * (the SMTP user must match the From address envelope, otherwise the
 * message gets rejected or rewritten).
 *
 * Tenant branding is still applied — see `getTenantSender` below — but only
 * at the display-name + Reply-To layer, not at the transport layer.
 *
 * Cached so we don't open a new TCP connection on every send.
 */
function getTransporter(): Transporter {
  const config = useRuntimeConfig()
  const host = smtpHost(config)
  const port = smtpPort(config)
  const user = smtpUser(config)
  const pass = smtpPass(config)
  const secure = process.env.SMTP_SECURE === 'true'

  const key = `${host}:${port}:${user}:${secure}`
  const existing = transporterCache.get(key)
  if (existing) return existing

  const created = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user || pass ? { user, pass } : undefined,
  })
  transporterCache.set(key, created)
  return created
}

function normalizeRecipientEmails(to: string | string[]): string[] {
  const raw = Array.isArray(to) ? to : String(to).split(/[,;]+/)
  const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return [...new Set(raw.map((e) => e.trim()).filter((e) => rx.test(e)))]
}

/**
 * Send an email and report whether MailerLite or SMTP delivered it.
 */
export async function sendEmailDetailed(options: EmailOptions): Promise<SendEmailResult> {
  let mailerLiteSkippedReason: string | undefined
  let attemptedMailerliteRoute = false

  try {
    const config = useRuntimeConfig()
    const adminId = options.adminId ?? null

    // MailerLite path: tenant preference is evaluated FIRST so missing token logs clearly (not silently skipped).
    if (adminId != null && !options.attachments?.length) {
      const outbound = await getTenantEmailOutbound(adminId)
      if (outbound.channel === 'mailerlite') {
        attemptedMailerliteRoute = true
        const token = process.env.MAILERLITE_API_TOKEN?.trim()
        if (!token) {
          mailerLiteSkippedReason =
            'MAILERLITE_API_TOKEN is not set on this server — add it to .env (or container env) and restart the app.'
          console.warn('[email] MailerLite chosen for tenant but MAILERLITE_API_TOKEN missing — falling back to SMTP')
        } else {
          const mlFrom = await getTenantMailerLiteFromIdentity(adminId)
          const recipients = normalizeRecipientEmails(options.to)
          if (!mlFrom) {
            mailerLiteSkippedReason =
              'Saved From Email is missing — save Email settings with a verified MailerLite sender address.'
            console.warn('[email] MailerLite enabled but From Email missing — falling back to SMTP')
          } else if (recipients.length === 0) {
            mailerLiteSkippedReason = 'No valid recipient addresses.'
            console.warn('[email] MailerLite: no valid recipients — falling back to SMTP')
          } else {
            let replySingle: string | null = null
            if (options.replyTo != null && options.replyTo !== '') {
              replySingle = Array.isArray(options.replyTo)
                ? options.replyTo[0] || null
                : options.replyTo
            } else {
              try {
                const sender = await getTenantSender(adminId)
                replySingle = sender.replyTo
              } catch {
                /* ignore */
              }
            }

            const mlOk = await sendViaMailerLiteCampaign({
              recipients,
              subject: options.subject,
              html: options.html,
              text: options.text,
              fromEmail: mlFrom.fromEmail,
              fromName: mlFrom.fromName,
              replyTo: replySingle,
            })
            if (mlOk) {
              return { ok: true, deliveredVia: 'mailerlite' }
            }
            mailerLiteSkippedReason =
              'MailerLite API rejected this send or returned an error — check server logs for lines tagged [mailerlite].'
            console.warn('[email] MailerLite outbound failed — falling back to SMTP')
          }
        }
      }
    }

    // Platform SMTP is the single source of truth for the transport layer.
    // Tenant branding still applies below via getTenantSender (display name +
    // Reply-To) but the envelope sender / credentials come from .env so
    // Gmail/Workspace don't reject the message.
    const transport = getTransporter()

    // Resolve per-tenant From identity when caller passed adminId AND
    // didn't override `from`/`replyTo`. We never overwrite explicit
    // values — callers like contact.post.ts (where replyTo is the
    // visitor's email) must keep working.
    //
    // Important: since the transport always authenticates as the platform
    // SMTP user (SMTP_USERNAME), the envelope address in From MUST be the
    // platform SMTP user — otherwise Gmail/Workspace will rewrite or reject
    // the message. We only inject the tenant's *display name* so recipients
    // still see their broker's brand (e.g. `"Tona Homes" <real4ojus@gmail.com>`).
    // Tenant-specific email addresses go in Reply-To, which has no such
    // restriction.
    let resolvedFrom = options.from
    let resolvedReplyTo: string | string[] | undefined = options.replyTo
    if (options.adminId != null) {
      try {
        const sender = await getTenantSender(options.adminId)
        if (!resolvedFrom) {
          const envelope = smtpUser(config) || process.env.SMTP_SENDER || process.env.SMTP_FROM || ''
          const displayName = (sender.displayName || '').trim()
          if (displayName && envelope) {
            // Quote the display name if it contains characters that would
            // break a bare RFC 5322 atom. Safe-quote everything for simplicity.
            const safeName = displayName.replace(/"/g, '\\"')
            resolvedFrom = `"${safeName}" <${envelope}>`
          } else if (envelope) {
            resolvedFrom = envelope
          }
        }
        if (!resolvedReplyTo && sender.replyTo) resolvedReplyTo = sender.replyTo
      } catch (err) {
        console.warn('[email] tenant sender lookup failed, using global SMTP defaults:', err)
      }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: resolvedFrom || process.env.SMTP_SENDER || config.smtpSender || process.env.SMTP_FROM || 'noreply@homebyabdul.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments,
      ...(resolvedReplyTo
        ? { replyTo: Array.isArray(resolvedReplyTo) ? resolvedReplyTo.join(', ') : resolvedReplyTo }
        : {}),
    }

    await transport.sendMail(mailOptions)
    return {
      ok: true,
      deliveredVia: 'smtp',
      mailerLiteSkippedReason: attemptedMailerliteRoute ? mailerLiteSkippedReason : undefined,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      ok: false,
      mailerLiteSkippedReason: attemptedMailerliteRoute ? mailerLiteSkippedReason : undefined,
    }
  }
}

/**
 * Send an email (backward-compatible boolean).
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const r = await sendEmailDetailed(options)
  return r.ok
}

/**
 * Send newsletter to multiple recipients
 */
export async function sendNewsletterBatch(
  subscribers: Array<{ id: number; email: string; firstName?: string | null; lastName?: string | null }>,
  campaign: {
    id: number
    subject: string
    content: string
    plainTextContent?: string
    attachments?: any
  },
  options?: {
    /**
     * The tenant whose newsletter is being sent. Used to build absolute
     * unsubscribe links that point at the right tenant subdomain / custom
     * domain. Pass null for cross-tenant or single-tenant sends — the helper
     * will fall back to NUXT_PUBLIC_SITE_URL / APP_URL.
     */
    adminId?: number | null
  }
): Promise<{ success: number; failed: number; errors: any[] }> {
  const results = { success: 0, failed: 0, errors: [] as any[] }
  const siteUrl = await getTenantSiteUrl(options?.adminId ?? null)

  const adminId = options?.adminId ?? null
  // Base URL for tracking / unsubscribe links. Falls back to platform site URL
  // when the tenant hasn't bound a domain yet (otherwise links would be relative
  // and 404 in every mail client).
  const linkBase =
    siteUrl ||
    process.env.NUXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ''

  // Send emails in batches to avoid rate limits
  const batchSize = 50
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          // Personalize content
          let personalizedContent = campaign.content
            .replace(/\{firstName\}/g, subscriber.firstName || '')
            .replace(/\{lastName\}/g, subscriber.lastName || '')
            .replace(/\{email\}/g, subscriber.email)

          // Per-recipient signed tokens — recipient can't tamper with the link
          // to unsubscribe or pollute open/click counts for someone else.
          if (adminId != null) {
            const unsubToken = signNewsletterToken({ t: 'u', sid: subscriber.id, aid: adminId })
            const openToken = signNewsletterToken({ t: 'o', sid: subscriber.id, nid: campaign.id, aid: adminId })

            const unsubscribeLink = linkBase
              ? `${linkBase}/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`
              : `/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`

            // Rewrite <a href="..."> to route through the click-tracking
            // endpoint, which verifies the HMAC then 302-redirects to the
            // original URL. Only rewrites absolute http(s) links so we don't
            // break mailto:, tel:, anchors, or our own unsubscribe footer.
            personalizedContent = rewriteLinksForTracking(
              personalizedContent,
              subscriber.id,
              campaign.id,
              adminId,
              linkBase,
            )

            // 1×1 transparent open-tracking pixel. Some mail clients block
            // remote images by default — that's fine; opens just won't fire
            // for those readers, matching how every mainstream ESP behaves.
            const pixelUrl = linkBase
              ? `${linkBase}/api/newsletter/track/open?token=${encodeURIComponent(openToken)}`
              : ''
            if (pixelUrl) {
              personalizedContent += `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;outline:none;text-decoration:none;height:1px;width:1px;" />`
            }

            personalizedContent += `<br><br><small style="color:#999"><a href="${unsubscribeLink}" style="color:#999">Unsubscribe</a></small>`
          } else {
            // Cross-tenant / platform send with no adminId — best-effort
            // unsubscribe by email (legacy). Token can't be signed without
            // an adminId so we degrade gracefully.
            const fallbackLink = linkBase
              ? `${linkBase}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
              : `/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
            personalizedContent += `<br><br><small><a href="${fallbackLink}">Unsubscribe</a></small>`
          }

          const sent = await sendEmail({
            to: subscriber.email,
            subject: campaign.subject,
            html: personalizedContent,
            text: campaign.plainTextContent,
            attachments: campaign.attachments ? JSON.parse(JSON.stringify(campaign.attachments)) : undefined,
            // Forward tenant identity so per-subscriber sends inherit the
            // tenant's branded From + Reply-To. Without this, a
            // newsletter blast from "tonahomes.deelbot.ai" would still
            // show the global SMTP_SENDER as From.
            adminId,
          })

          if (sent) {
            results.success++
          } else {
            results.failed++
            results.errors.push({ email: subscriber.email, error: 'Failed to send' })
          }
        } catch (error) {
          results.failed++
          results.errors.push({ email: subscriber.email, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      })
    )

    // Add delay between batches to respect rate limits
    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Replace every absolute http(s) `<a href="...">` with a click-tracking
 * redirect URL. The original URL is appended as `&u=<base64url>` so the
 * tracking endpoint can verify the HMAC, increment counts, and 302 to it.
 *
 * Leaves alone:
 *  • the unsubscribe footer link (we append it AFTER this pass)
 *  • mailto:, tel:, anchors, javascript: (security)
 *  • relative URLs (mail clients can't open them anyway)
 */
function rewriteLinksForTracking(
  html: string,
  subscriberId: number,
  campaignId: number,
  adminId: number,
  linkBase: string,
): string {
  if (!linkBase) return html
  const clickToken = signNewsletterToken({ t: 'c', sid: subscriberId, nid: campaignId, aid: adminId })

  return html.replace(
    /<a\b([^>]*?)href\s*=\s*(['"])(https?:\/\/[^'"]+)\2([^>]*)>/gi,
    (_match, beforeHref, quote, originalUrl, afterHref) => {
      const u = Buffer.from(originalUrl, 'utf8').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      const trackingUrl = `${linkBase}/api/newsletter/track/click?token=${encodeURIComponent(clickToken)}&u=${u}`
      return `<a${beforeHref}href=${quote}${trackingUrl}${quote}${afterHref}>`
    },
  )
}

/**
 * Strip HTML tags from content for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate email template with basic styling
 */
export function generateEmailTemplate(content: string, options?: {
  title?: string
  preheader?: string
  footerText?: string
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${options?.preheader ? `<meta name="description" content="${options.preheader}">` : ''}
  <title>${options?.title || 'Newsletter'}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #121212;
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .content {
      padding: 40px 20px;
      color: #333333;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #8c734b;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${options?.preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.preheader}</div>` : ''}
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">DeelBot</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${options?.footerText || 'You received this email because you subscribed to our newsletter.'}</p>
      <p>© ${new Date().getFullYear()} DeelBot. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getTenantSender, getTenantSiteUrl, getTenantSmtpConfig } from './tenantSiteUrl'
import type { TenantSmtpConfig } from './tenantSiteUrl'

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
 * Get-or-create a transporter. When `tenantSmtp` is provided the
 * transport authenticates against the tenant's own SMTP relay
 * (per-tenant override). Otherwise falls back to the platform
 * SMTP_USERNAME / SMTP_PASSWORD env vars.
 *
 * Both paths cache by `host:port:user` so we don't open a new
 * connection on every send.
 */
function getTransporter(tenantSmtp?: TenantSmtpConfig | null): Transporter {
  let host: string
  let port: number
  let user: string
  let pass: string
  let secure: boolean

  if (tenantSmtp) {
    host = tenantSmtp.host
    port = tenantSmtp.port
    user = tenantSmtp.username
    pass = tenantSmtp.password
    secure = tenantSmtp.secure
  } else {
    const config = useRuntimeConfig()
    host = smtpHost(config)
    port = smtpPort(config)
    user = smtpUser(config)
    pass = smtpPass(config)
    secure = process.env.SMTP_SECURE === 'true'
  }

  const key = `${host}:${port}:${user}:${pass}:${secure}`
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

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = useRuntimeConfig()

    // Resolve per-tenant SMTP relay (returns null unless the tenant
    // explicitly configured all four required fields). The transporter
    // is then keyed against those creds; otherwise platform SMTP is used.
    let tenantSmtp: TenantSmtpConfig | null = null
    if (options.adminId != null) {
      try {
        tenantSmtp = await getTenantSmtpConfig(options.adminId)
      } catch (err) {
        console.warn('[email] tenant SMTP lookup failed, using platform SMTP:', err)
      }
    }
    const transport = getTransporter(tenantSmtp)

    // Resolve per-tenant sender identity when caller passed adminId AND
    // didn't override `from`/`replyTo`. We never overwrite explicit
    // values — callers like contact.post.ts (where replyTo is the
    // visitor's email) must keep working.
    let resolvedFrom = options.from
    let resolvedReplyTo: string | string[] | undefined = options.replyTo
    if (options.adminId != null) {
      try {
        const sender = await getTenantSender(options.adminId)
        if (!resolvedFrom) resolvedFrom = sender.formatted
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
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
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

          const unsubscribeLink = siteUrl
            ? `${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
            : `/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
          personalizedContent += `<br><br><small><a href="${unsubscribeLink}">Unsubscribe</a></small>`

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
            adminId: options?.adminId ?? null,
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

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer | string
    contentType?: string
  }>
}

let transporter: Transporter | null = null

/**
 * Get or create email transporter
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter
  }

  const config = useRuntimeConfig()

  // Configure based on runtime config (from nuxt.config.ts)
  transporter = nodemailer.createTransport({
    host: config.smtpHostname || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(config.smtpPort || process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: config.smtpUsername || process.env.SMTP_USER,
      pass: config.smtpPassword || process.env.SMTP_PASSWORD
    }
  })

  return transporter
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = useRuntimeConfig()
    const transport = getTransporter()
    
    const mailOptions = {
      from: options.from || config.smtpSender || process.env.SMTP_FROM || 'noreply@homebyabdul.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments
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
  subscribers: Array<{ id: number; email: string; firstName?: string; lastName?: string }>,
  campaign: {
    id: number
    subject: string
    content: string
    plainTextContent?: string
    attachments?: any
  }
): Promise<{ success: number; failed: number; errors: any[] }> {
  const results = { success: 0, failed: 0, errors: [] as any[] }
  const config = useRuntimeConfig()
  const siteUrl = (config.public?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || process.env.APP_URL || '').replace(/\/$/, '')

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

          // Add unsubscribe link
          const baseUrl = siteUrl || process.env.APP_URL || ''
          const unsubscribeLink = baseUrl
            ? `${baseUrl}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
            : `/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
          personalizedContent += `<br><br><small><a href="${unsubscribeLink}">Unsubscribe</a></small>`

          const sent = await sendEmail({
            to: subscriber.email,
            subject: campaign.subject,
            html: personalizedContent,
            text: campaign.plainTextContent,
            attachments: campaign.attachments ? JSON.parse(JSON.stringify(campaign.attachments)) : undefined
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
      <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">Alberta One Real Estate</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${options?.footerText || 'You received this email because you subscribed to our newsletter.'}</p>
      <p>© ${new Date().getFullYear()} Alberta One Real Estate. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Tenant-branded newsletter welcome email.
 *
 * Why this exists
 * ───────────────
 * When a visitor subscribes via the footer (Footer.vue), they get back a
 * "thank you" toast — but nothing in their inbox. That's a missed branding
 * touchpoint and trains people to forget they ever subscribed (resulting in
 * spam complaints when the first real campaign arrives weeks later).
 *
 * This module renders a single welcome email per subscriber and ships it
 * through the existing tenant-aware send pipeline (see server/utils/email.ts).
 * The look-and-feel is driven by the broker's own TenantSettings row —
 * business name, logo, tagline, primary colour, socials, contact details —
 * so "AOhomes" subscribers get an AOhomes-branded note, "Tona Homes"
 * subscribers get a Tona-branded note, etc.
 *
 * What's tenant-tailored
 * ──────────────────────
 *  • From: "<BusinessName>" + Reply-To: tenant inbox (via getTenantSender)
 *  • Subject line includes the tenant business name
 *  • Header bar uses the tenant's primaryColor + their logo
 *  • Greeting addresses the subscriber by first name when available
 *  • Footer renders the tenant's contact + social links
 *  • One-click signed unsubscribe link points at the tenant's own site URL
 *
 * Per-tenant overrides (managed via the Welcome Email admin page; persisted
 * in the Setting table):
 *  • newsletter.welcomeEnabled    — "false" disables welcome emails entirely
 *  • newsletter.welcomeSubject    — full subject line override
 *  • newsletter.welcomeIntro      — HTML/text snippet replacing the default
 *                                   intro paragraph.
 *
 * Failure model
 * ─────────────
 * The SEND path (`sendNewsletterWelcomeEmail`) NEVER throws to the caller.
 * A welcome-email failure must not block subscription creation — the
 * subscriber is already in the DB by the time we get called. Errors are
 * logged and swallowed.
 *
 * The RENDER path (`renderWelcomeEmailHtml`) is allowed to throw —
 * preview/test endpoints catch and report; the send path catches internally.
 */

import { PrismaClient } from '@prisma/client'
import { sendEmail } from './email'
import { getTenantSiteUrl } from './tenantSiteUrl'
import { signNewsletterToken } from './newsletterTokens'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export const WELCOME_SETTING_KEYS = {
  enabled: 'newsletter.welcomeEnabled',
  subject: 'newsletter.welcomeSubject',
  intro: 'newsletter.welcomeIntro',
} as const

interface WelcomeSubscriber {
  id: number
  email: string
  firstName?: string | null
  lastName?: string | null
}

interface WelcomeOptions {
  adminId: number
  subscriber: WelcomeSubscriber
  /**
   * "new" for a fresh subscription, "reactivation" for a previously
   * unsubscribed user who's re-opted-in. The copy is tweaked slightly so
   * we say "Welcome back" instead of "Welcome".
   */
  flavor: 'new' | 'reactivation'
}

export interface TenantBranding {
  businessName: string
  tagline: string | null
  logoUrl: string | null
  primaryColor: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  city: string | null
  province: string | null
  socialLinks: Array<{ name?: string; url?: string; icon?: string }>
}

export interface WelcomeOverrides {
  enabled: boolean
  subject: string | null
  intro: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Light validation/normalisation for the tenant primary colour. Falls back
 * to a neutral default if the column holds a garbage value — colour strings
 * land in inline `style="background:…"` so we want to be defensive even
 * though TenantSettings is admin-owned.
 */
function safeColor(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  const trimmed = String(raw).trim()
  // Accept #RGB, #RRGGBB, or named css colours (a–z only)
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z]+$/.test(trimmed) && trimmed.length <= 24) return trimmed
  return fallback
}

/**
 * Determine if a hex colour is "dark enough" that we should render header
 * text in white. Anything brighter gets near-black text for legibility.
 * Falls back to white when the colour isn't a recognisable hex (named CSS
 * colours rarely cause WCAG misses on white).
 */
function readableForeground(bg: string): string {
  const m = bg.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return '#ffffff'
  let hex = m[1]!
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Perceived luminance (sRGB)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.6 ? '#ffffff' : '#1a1a1a'
}

export async function loadTenantBranding(adminId: number): Promise<TenantBranding> {
  const [settings, admin] = await Promise.all([
    prisma.tenantSettings.findUnique({
      where: { adminId },
      select: {
        businessName: true,
        tagline: true,
        logoUrl: true,
        primaryColor: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        socialLinks: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true, email: true },
    }),
  ])

  const adminFullName = [admin?.firstName, admin?.lastName].filter(Boolean).join(' ').trim()
  const businessName = settings?.businessName?.trim() || adminFullName || 'Our Newsletter'

  let socials: Array<{ name?: string; url?: string; icon?: string }> = []
  const rawSocial = settings?.socialLinks
  if (Array.isArray(rawSocial)) {
    socials = rawSocial as any
  } else if (typeof rawSocial === 'string') {
    try {
      const parsed = JSON.parse(rawSocial)
      if (Array.isArray(parsed)) socials = parsed
    } catch {
      /* leave empty */
    }
  }

  return {
    businessName,
    tagline: settings?.tagline?.trim() || null,
    logoUrl: settings?.logoUrl?.trim() || null,
    primaryColor: safeColor(settings?.primaryColor, '#1976D2'),
    contactEmail: settings?.email?.trim() || admin?.email?.trim() || null,
    contactPhone: settings?.phone?.trim() || null,
    address: settings?.address?.trim() || null,
    city: settings?.city?.trim() || null,
    province: settings?.province?.trim() || null,
    socialLinks: socials.filter(s => s && typeof s === 'object' && (s.url || '').trim().length > 0),
  }
}

export async function loadWelcomeOverrides(adminId: number): Promise<WelcomeOverrides> {
  // Per-tenant overrides live in the Setting table so admins can change
  // copy from the Welcome Email page without a code deploy. Defaults to
  // enabled when no row exists.
  try {
    const rows = await prisma.setting.findMany({
      where: {
        adminId,
        key: { in: [WELCOME_SETTING_KEYS.enabled, WELCOME_SETTING_KEYS.subject, WELCOME_SETTING_KEYS.intro] },
      },
      select: { key: true, value: true },
    })
    const byKey = new Map(rows.map(r => [r.key, r.value]))
    const enabledRaw = (byKey.get(WELCOME_SETTING_KEYS.enabled) || '').trim().toLowerCase()
    const enabled = enabledRaw === ''
      ? true // default ON
      : !(['false', '0', 'no', 'off', 'disabled'].includes(enabledRaw))
    return {
      enabled,
      subject: byKey.get(WELCOME_SETTING_KEYS.subject)?.trim() || null,
      intro: byKey.get(WELCOME_SETTING_KEYS.intro)?.trim() || null,
    }
  } catch (err) {
    console.error('[newsletter:welcome] overrides lookup failed:', err)
    return { enabled: true, subject: null, intro: null }
  }
}

function renderHeader(branding: TenantBranding): string {
  const bg = branding.primaryColor
  const fg = readableForeground(bg)
  const businessNameHtml = escapeHtml(branding.businessName)
  const taglineHtml = branding.tagline ? escapeHtml(branding.tagline) : ''
  const logo = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${businessNameHtml}" style="max-height:56px;max-width:200px;display:inline-block;border:0;outline:none;text-decoration:none;" />`
    : ''

  return `
    <div style="background:${bg};color:${fg};padding:40px 24px;text-align:center;">
      ${logo
        ? logo
        : `<div style="font-size:24px;font-weight:700;letter-spacing:-0.5px;">${businessNameHtml}</div>`}
      ${taglineHtml ? `<div style="margin-top:10px;font-size:13px;opacity:0.85;">${taglineHtml}</div>` : ''}
    </div>
  `
}

function renderContactBlock(branding: TenantBranding): string {
  const parts: string[] = []
  if (branding.address || branding.city || branding.province) {
    const line = [branding.address, branding.city, branding.province]
      .filter((v): v is string => Boolean(v))
      .map(escapeHtml)
      .join(', ')
    if (line) parts.push(`<div>${line}</div>`)
  }
  if (branding.contactPhone) {
    parts.push(`<div><a href="tel:${escapeHtml(branding.contactPhone)}" style="color:inherit;text-decoration:none;">${escapeHtml(branding.contactPhone)}</a></div>`)
  }
  if (branding.contactEmail) {
    parts.push(`<div><a href="mailto:${escapeHtml(branding.contactEmail)}" style="color:inherit;text-decoration:none;">${escapeHtml(branding.contactEmail)}</a></div>`)
  }
  if (parts.length === 0) return ''
  return `<div style="margin-top:18px;font-size:12px;color:#666;line-height:1.7;">${parts.join('')}</div>`
}

function renderSocialLinks(branding: TenantBranding): string {
  if (!branding.socialLinks.length) return ''
  const items = branding.socialLinks
    .map(s => {
      const url = (s.url || '').trim()
      if (!/^https?:\/\//i.test(url)) return ''
      const name = s.name?.trim() || s.icon?.replace(/^mdi-/, '') || 'Follow'
      return `<a href="${escapeHtml(url)}" style="color:#666;text-decoration:underline;margin:0 8px;">${escapeHtml(name)}</a>`
    })
    .filter(Boolean)
  if (!items.length) return ''
  return `<div style="margin-top:16px;font-size:12px;color:#666;">${items.join('')}</div>`
}

/**
 * Apply {firstName}, {lastName}, {email}, {businessName} merge tags. Used
 * for the admin-supplied intro so they can write "Hi {firstName}, …" and
 * have it personalise per recipient. Tag names mirror the broadcast
 * sender's tags (see sendNewsletterBatch in email.ts) for consistency.
 */
function applyMergeTags(
  template: string,
  vars: { firstName: string; lastName: string; email: string; businessName: string },
): string {
  return template
    .replace(/\{firstName\}/g, vars.firstName || '')
    .replace(/\{lastName\}/g, vars.lastName || '')
    .replace(/\{email\}/g, vars.email || '')
    .replace(/\{businessName\}/g, vars.businessName || '')
}

function renderIntro(
  branding: TenantBranding,
  firstName: string,
  flavor: 'new' | 'reactivation',
  intro: string | null,
  subscriberEmail: string,
  lastName: string,
): string {
  const greeting = firstName
    ? `Hi ${escapeHtml(firstName)},`
    : 'Hello,'

  const welcomeLine = flavor === 'reactivation'
    ? `Welcome back to <strong>${escapeHtml(branding.businessName)}</strong>.`
    : `Thanks for subscribing to <strong>${escapeHtml(branding.businessName)}</strong>.`

  // Tenant-supplied intro takes precedence. We trust the admin-authored
  // HTML since this is written by an authenticated admin in the Welcome
  // Email page, but we still run merge tags through it so personalisation
  // works.
  if (intro) {
    const personalised = applyMergeTags(intro, {
      firstName,
      lastName,
      email: subscriberEmail,
      businessName: branding.businessName,
    })
    return `
      <p style="font-size:16px;margin:0 0 12px 0;">${greeting}</p>
      <div style="font-size:15px;color:#333;line-height:1.7;">${personalised}</div>
    `
  }

  return `
    <p style="font-size:16px;margin:0 0 12px 0;">${greeting}</p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 14px 0;">
      ${welcomeLine}
    </p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 14px 0;">
      You'll now receive our curated property collections, fresh listings, and
      local market insights — delivered straight to your inbox. No spam, just
      the homes and trends worth your time.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 14px 0;">
      Here's what to expect next:
    </p>
    <ul style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px 24px;padding:0;">
      <li>New listings tailored to your area as they hit the market</li>
      <li>Monthly market pulse — what's selling, what's stalling, where prices are heading</li>
      <li>Occasional invitations to open houses and buyer/seller events</li>
    </ul>
  `
}

function renderCta(branding: TenantBranding, siteUrl: string | null): string {
  if (!siteUrl) return ''
  return `
    <div style="text-align:center;margin:28px 0 8px 0;">
      <a href="${escapeHtml(siteUrl)}"
         style="display:inline-block;background:${branding.primaryColor};color:${readableForeground(branding.primaryColor)};text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">
        Browse Listings
      </a>
    </div>
  `
}

export interface RenderWelcomeEmailInput {
  branding: TenantBranding
  overrides: WelcomeOverrides
  subscriber: {
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  flavor: 'new' | 'reactivation'
  siteUrl: string | null
  /**
   * Already-built unsubscribe URL (token-signed). Pass null in preview
   * contexts where there's no real subscriber to sign for — the renderer
   * will render a non-clickable placeholder instead.
   */
  unsubscribeLink: string | null
}

export interface RenderedWelcomeEmail {
  subject: string
  html: string
}

/**
 * Pure renderer — no DB, no SMTP. Takes a fully-resolved input bundle and
 * returns subject + HTML. Reused by:
 *  - the send path (real subscribers)
 *  - the admin preview endpoint (uses the logged-in admin's own info as
 *    the stand-in subscriber)
 *  - the admin "send test" endpoint (real send, but to a manually-typed
 *    test address)
 */
export function renderWelcomeEmailHtml(input: RenderWelcomeEmailInput): RenderedWelcomeEmail {
  const { branding, overrides, subscriber, flavor, siteUrl, unsubscribeLink } = input

  const firstName = (subscriber.firstName || '').trim()
  const lastName = (subscriber.lastName || '').trim()

  const rawSubject = (overrides.subject || (flavor === 'reactivation'
    ? `Welcome back to {businessName}`
    : `Welcome to {businessName}`)).trim()
  const subject = applyMergeTags(rawSubject, {
    firstName,
    lastName,
    email: subscriber.email,
    businessName: branding.businessName,
  })

  // Preview / preview-no-real-link case: render a visually-correct but
  // non-clickable footer link so the admin sees the right layout without
  // generating real unsubscribe tokens.
  const unsubLinkHtml = unsubscribeLink
    ? `<a href="${escapeHtml(unsubscribeLink)}" style="color:#999;text-decoration:underline;">Unsubscribe</a>`
    : `<span style="color:#999;text-decoration:underline;">Unsubscribe</span>`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <!-- Preheader: hidden inbox preview text shown by Gmail/Outlook before the email is opened. -->
  <div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(`You're in. Curated listings and market insights from ${branding.businessName}.`)}
  </div>
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    ${renderHeader(branding)}
    <div style="padding:36px 32px 28px 32px;">
      ${renderIntro(branding, firstName, flavor, overrides.intro, subscriber.email, lastName)}
      ${renderCta(branding, siteUrl)}
    </div>
    <div style="padding:24px 32px 32px 32px;border-top:1px solid #ececec;background:#fafafa;color:#666;text-align:center;">
      <div style="font-size:13px;color:#444;font-weight:600;">${escapeHtml(branding.businessName)}</div>
      ${renderContactBlock(branding)}
      ${renderSocialLinks(branding)}
      <div style="margin-top:22px;font-size:11px;color:#999;line-height:1.6;">
        You're receiving this email because you subscribed at
        ${siteUrl ? `<a href="${escapeHtml(siteUrl)}" style="color:#999;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>` : escapeHtml(branding.businessName)}.<br>
        Changed your mind? ${unsubLinkHtml}.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  return { subject, html }
}

/**
 * Send the welcome email. Returns true if SMTP/ML accepted the message,
 * false otherwise. Always swallows errors — call sites should treat this
 * as fire-and-forget.
 */
export async function sendNewsletterWelcomeEmail(opts: WelcomeOptions): Promise<boolean> {
  try {
    const { adminId, subscriber, flavor } = opts

    const overrides = await loadWelcomeOverrides(adminId)
    if (!overrides.enabled) {
      console.log(`[newsletter:welcome] disabled for adminId=${adminId}; skipping welcome to ${subscriber.email}`)
      return false
    }

    const [branding, siteUrl] = await Promise.all([
      loadTenantBranding(adminId),
      getTenantSiteUrl(adminId),
    ])

    // Per-recipient signed unsubscribe — same format as broadcast campaigns,
    // so a click from the welcome email lands at the same /newsletter/
    // unsubscribe?token=... page and works regardless of subdomain.
    const unsubToken = signNewsletterToken({ t: 'u', sid: subscriber.id, aid: adminId })
    const unsubscribeLink = siteUrl
      ? `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`
      : `/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`

    const { subject, html } = renderWelcomeEmailHtml({
      branding,
      overrides,
      subscriber,
      flavor,
      siteUrl,
      unsubscribeLink,
    })

    const sent = await sendEmail({
      to: subscriber.email,
      subject,
      html,
      // adminId triggers tenant From + Reply-To resolution in email.ts, so
      // the recipient sees "AOhomes <…>" instead of the platform sender.
      adminId,
    })
    if (!sent) {
      console.warn(`[newsletter:welcome] send returned false for ${subscriber.email} (adminId=${adminId})`)
    }
    return sent
  } catch (err) {
    console.error('[newsletter:welcome] unexpected failure:', err)
    return false
  }
}

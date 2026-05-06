/**
 * Per-tenant absolute site URL resolution for SERVER code (emails, ICS,
 * cron, outbound notifications).
 *
 * Why this exists
 * ───────────────
 * The shared Nuxt build serves every tenant subdomain. We can no longer rely
 * on `config.public.siteUrl` to build absolute links in outbound emails — it
 * is intentionally blank in multi-tenant deployments. Instead we resolve the
 * canonical URL per tenant from `TenantSettings.customDomain` /
 * `TenantSettings.subdomain`, with a request-scoped fast path and a cached
 * lookup layer to keep this off the email hot path.
 *
 * Resolution (per call)
 *   1. The current request's `Host` header (when available) — fastest, no DB.
 *      Used by request handlers like /api/properties/inquiry where the
 *      visitor IS on the tenant's site.
 *   2. `tenantSettings.customDomain` (e.g. "acmesrealty.com") → "https://…"
 *   3. `tenantSettings.subdomain` + APP_BASE_DOMAIN → "https://acme.deelbot.ai"
 *   4. process.env.NUXT_PUBLIC_SITE_URL  (single-tenant fallback)
 *   5. process.env.APP_URL / SITE_URL    (legacy)
 *   6. `https://${APP_BASE_DOMAIN}`      (apex SaaS host — branded fallback;
 *                                         logs a one-shot warning in prod
 *                                         because hitting this means orphan
 *                                         tenant routing data)
 *   7. "http://localhost:3000"           (dev last-resort, prod logs ERROR)
 *
 * The DB lookup is cached for TENANT_URL_TTL_MS (default 5 min) per adminId.
 */

import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const TENANT_URL_TTL_MS = 5 * 60_000
const TENANT_SENDER_TTL_MS = 5 * 60_000
const TENANT_SMTP_TTL_MS = 5 * 60_000

interface CachedUrl {
  url: string | null
  expiresAt: number
}

interface CachedSender {
  sender: TenantSender
  expiresAt: number
}

interface CachedSmtp {
  smtp: TenantSmtpConfig | null
  expiresAt: number
}

const cache = new Map<number, CachedUrl>()
const senderCache = new Map<number, CachedSender>()
const smtpCache = new Map<number, CachedSmtp>()

/**
 * Per-tenant SMTP relay config. When present (i.e. an admin filled in
 * Email Settings → SMTP fields completely), outbound mail for THAT
 * tenant uses these credentials and host instead of the platform-level
 * SMTP_USERNAME / SMTP_PASSWORD env vars. Saved by
 * /api/admin/settings/email.post.ts under key `email.smtp` in the
 * `Setting` table, scoped to that tenant's adminId.
 *
 * All four fields (host, username, password, port) must be present
 * AND non-empty for this to be considered "configured" — partial
 * configs are treated as null so we don't end up authenticating with
 * platform creds against a tenant SMTP host (which would silently fail
 * or send mis-branded mail).
 */
export interface TenantSmtpConfig {
  host: string
  port: number
  username: string
  password: string
  secure: boolean
}

/**
 * Per-tenant outbound email identity.
 *
 *  - `displayName`: human-readable sender name (e.g. "Tona Homes") that
 *    end-recipients see in their inbox. Falls back to admin's full name
 *    when TenantSettings.businessName is unset.
 *  - `replyTo`: the address replies should land in — the tenant admin's
 *    own inbox (TenantSettings.email if set, else User.email of the admin).
 *  - `formatted`: ready-to-use RFC-5322 string. Combine with the
 *    SMTP-authenticated address as the envelope sender so we never get
 *    rejected/rewritten by relays that enforce sender alignment (Gmail,
 *    Workspace, SES non-verified).
 *
 * Why we don't put `replyTo` directly into `From`:
 *   Most authenticated relays (Gmail SMTP especially) will REJECT or
 *   silently REWRITE a `From:` whose address differs from the
 *   authenticated user, unless the address is explicitly registered as a
 *   "Send As" alias. Using the tenant identity as DISPLAY NAME only —
 *   while keeping the envelope on SMTP_USERNAME — gives recipients a
 *   branded "From: Tona Homes <noreply@deelbot.ai>" without any SMTP
 *   server-side changes. Replies still route to the right tenant via
 *   `Reply-To`.
 */
export interface TenantSender {
  displayName: string
  replyTo: string | null
  envelopeAddress: string
  formatted: string
}

function trimSlash(s: string): string {
  return s.replace(/\/$/, '')
}

/**
 * Last-resort site URL when no per-tenant data is available.
 *
 * Prior bug (2026-05): this used to terminate at `http://localhost:3000`,
 * which meant any cron-driven email path (alerts/run-due, scheduled
 * notifications) baked localhost links into recipients' inboxes whenever
 * `user.adminId` failed to resolve to a TenantSettings row with a
 * subdomain or customDomain. End users tapped those on their phones and
 * saw "ERR_FAILED — http://localhost:3000/property/<id>".
 *
 * The chain now ends at `https://${APP_BASE_DOMAIN}` (the platform's
 * canonical SaaS host, e.g. https://deelbot.ai) instead of localhost,
 * so the worst case is "wrong tenant, but reachable, brand-correct
 * apex" rather than "broken link". Localhost only kicks in when neither
 * env var is set AND we're not in production — i.e. real local dev.
 *
 * In production, hitting this fallback at all means a user/property
 * row is missing tenant routing data — we log a single loud warning so
 * the orphan can be tracked down and fixed in the DB instead of being
 * masked forever by the apex fallback.
 */
let warnedAboutFallback = false
function envFallback(): string {
  const explicit = process.env.NUXT_PUBLIC_SITE_URL || process.env.APP_URL || process.env.SITE_URL
  if (explicit) return trimSlash(explicit)

  const baseDomain = (process.env.APP_BASE_DOMAIN || '').trim().toLowerCase()
  if (baseDomain) {
    if (process.env.NODE_ENV === 'production' && !warnedAboutFallback) {
      console.warn(
        `[tenantSiteUrl] envFallback hit in production — no per-tenant URL resolved. ` +
        `Using https://${baseDomain} as last-resort. Check that all User.adminId rows ` +
        `point to TenantSettings with subdomain or customDomain set.`
      )
      warnedAboutFallback = true
    }
    return `https://${baseDomain}`
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[tenantSiteUrl] envFallback hit in production with NO env vars set ' +
      '(NUXT_PUBLIC_SITE_URL, APP_URL, SITE_URL, APP_BASE_DOMAIN all empty). ' +
      'Outbound emails will contain http://localhost:3000 links. Fix this immediately.'
    )
  }
  return 'http://localhost:3000'
}

/**
 * Build an https URL from a host. Localhost / private LANs default to http.
 */
function urlFromHost(host: string): string {
  const h = host.trim().toLowerCase().replace(/:.*$/, '')
  const isLocal =
    h === 'localhost' ||
    h.startsWith('127.') ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.endsWith('.local')
  const proto = isLocal ? 'http' : 'https'
  return `${proto}://${host}`
}

/**
 * Derive the absolute origin from the incoming request's `Host` (+
 * `x-forwarded-proto`) header. Returns "" if not callable from a request.
 */
export function getRequestSiteUrl(event: H3Event | null | undefined): string {
  if (!event) return ''
  try {
    const host = getRequestHeader(event, 'host') || ''
    if (!host) return ''
    const xfProto = getRequestHeader(event, 'x-forwarded-proto') || ''
    const proto = xfProto.split(',')[0]?.trim()
    if (proto) return trimSlash(`${proto}://${host}`)
    return trimSlash(urlFromHost(host))
  } catch {
    return ''
  }
}

/**
 * Look up the canonical absolute URL for a tenant by their admin id.
 * Cached. Returns "" if no TenantSettings row exists and no env fallback
 * makes sense.
 */
export async function getTenantSiteUrl(adminId: number | null | undefined): Promise<string> {
  if (!adminId) return envFallback()

  const cached = cache.get(adminId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url || envFallback()
  }

  let url: string | null = null
  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { adminId },
      select: { subdomain: true, customDomain: true },
    })
    if (settings) {
      const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase()
      if (settings.customDomain) {
        url = trimSlash(urlFromHost(settings.customDomain))
      } else if (settings.subdomain && baseDomain) {
        url = trimSlash(urlFromHost(`${settings.subdomain}.${baseDomain}`))
      }
    }
  } catch (err) {
    console.error('[tenantSiteUrl] lookup failed for adminId', adminId, err)
  }

  cache.set(adminId, { url, expiresAt: Date.now() + TENANT_URL_TTL_MS })
  return url || envFallback()
}

/**
 * Best-of-both helper: prefer the live request `Host` if we have an event
 * (cheap + always correct for the tenant the visitor is on), fall back to
 * the per-tenant DB lookup, then env. Use this in request handlers that
 * already have an `event` AND know the `adminId` (e.g. inquiry / viewing
 * request emails to the realtor).
 */
export async function getTenantSiteUrlForEvent(
  event: H3Event | null | undefined,
  adminId: number | null | undefined,
): Promise<string> {
  const fromEvent = getRequestSiteUrl(event)
  if (fromEvent) return fromEvent
  return getTenantSiteUrl(adminId)
}

/**
 * Internal-fetch base URL for server-to-server calls (e.g. the alert
 * scheduler that calls /api/alerts/run-due on itself, or the alert runner
 * fetching /api/properties). These never leave the box, so we use loopback
 * to avoid round-tripping through the public proxy / TLS / tenant routing.
 */
export function getInternalApiBase(): string {
  if (process.env.INTERNAL_API_BASE) return trimSlash(process.env.INTERNAL_API_BASE)
  const port = process.env.NITRO_PORT || process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}

/**
 * Test-only: clear the in-memory cache. Avoid in production code.
 */
export function _clearTenantSiteUrlCache(): void {
  cache.clear()
  senderCache.clear()
  smtpCache.clear()
}

/**
 * Escape RFC-5322 display name. Quotes the name and backslash-escapes
 * any embedded quotes/backslashes so e.g. `"Tona's Homes"` doesn't break
 * the header. Returns the display fragment without the address part.
 */
function quoteDisplayName(name: string): string {
  if (!name) return ''
  const cleaned = name.trim()
  if (!cleaned) return ''
  const escaped = cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

function envSmtpUsername(): string {
  return process.env.SMTP_SENDER || process.env.SMTP_USERNAME || process.env.SMTP_FROM || 'noreply@homebyabdul.com'
}

function defaultSender(): TenantSender {
  const envelope = envSmtpUsername()
  return {
    displayName: '',
    replyTo: null,
    envelopeAddress: envelope,
    formatted: envelope,
  }
}

/**
 * Resolve the per-tenant sender identity for outbound email.
 *
 * Resolution (per call):
 *   1. If `adminId` is null/undefined → global default (no display name,
 *      envelope = SMTP_USERNAME).
 *   2. Per-tenant Email Settings (Setting table, written by
 *      /api/admin/settings/email):
 *        - displayName ← `email.fromName`
 *        - envelope    ← `email.fromEmail` (ONLY if per-tenant SMTP is
 *          ALSO configured — see `getTenantSmtpConfig` — otherwise
 *          using a tenant fromEmail with the platform SMTP relay would
 *          get rejected/rewritten by Gmail. Safer to fall through to
 *          the platform SMTP_SENDER envelope.)
 *        - replyTo     ← `email.fromEmail`
 *   3. TenantSettings.businessName + TenantSettings.email — the
 *      tenant's branded identity (no SMTP override needed).
 *   4. Admin User row — businessName falls back to "FirstName LastName",
 *      replyTo falls back to admin's account email.
 *   5. Default if no row found (orphaned adminId).
 *
 * The result is cached for TENANT_SENDER_TTL_MS to keep this off the
 * email hot path. Cache is invalidated by `clearTenantEmailCache(adminId)`
 * which the email-settings save endpoint must call.
 */
export async function getTenantSender(adminId: number | null | undefined): Promise<TenantSender> {
  if (!adminId) return defaultSender()

  const cached = senderCache.get(adminId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.sender
  }

  let sender: TenantSender = defaultSender()
  try {
    const [settings, admin, emailSettingsRows, tenantSmtp] = await Promise.all([
      prisma.tenantSettings.findUnique({
        where: { adminId },
        select: { businessName: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: adminId },
        select: { firstName: true, lastName: true, email: true },
      }),
      prisma.setting.findMany({
        where: {
          adminId,
          key: { in: ['email.fromName', 'email.fromEmail'] },
        },
        select: { key: true, value: true },
      }),
      getTenantSmtpConfig(adminId),
    ])

    const emailFromName = emailSettingsRows.find(r => r.key === 'email.fromName')?.value?.trim() || ''
    const emailFromAddr = emailSettingsRows.find(r => r.key === 'email.fromEmail')?.value?.trim() || ''

    const businessName = settings?.businessName?.trim() || ''
    const adminFullName = [admin?.firstName, admin?.lastName].filter(Boolean).join(' ').trim()
    const displayName = emailFromName || businessName || adminFullName

    const replyTo = emailFromAddr || settings?.email?.trim() || admin?.email?.trim() || null

    // SAFETY: only override the envelope address when the tenant has
    // ALSO configured per-tenant SMTP. Otherwise the platform SMTP
    // relay (Gmail authenticated as SMTP_USERNAME) won't be allowed to
    // send "From: <tenant address>" and Gmail will silently rewrite or
    // reject. Falling through to envSmtpUsername() keeps the verified
    // SMTP_SENDER (e.g. noreply@deelbot.ai) as the envelope, which
    // always works.
    const envelope = (tenantSmtp && emailFromAddr) ? emailFromAddr : envSmtpUsername()
    const quoted = quoteDisplayName(displayName)
    const formatted = quoted ? `${quoted} <${envelope}>` : envelope

    sender = { displayName, replyTo, envelopeAddress: envelope, formatted }
  } catch (err) {
    console.error('[tenantSender] lookup failed for adminId', adminId, err)
  }

  senderCache.set(adminId, { sender, expiresAt: Date.now() + TENANT_SENDER_TTL_MS })
  return sender
}

/**
 * Resolve per-tenant SMTP relay credentials from the Setting table
 * (key = `email.smtp`). Returns null when:
 *   - adminId is null/undefined (cross-tenant or platform-direct send), OR
 *   - no `email.smtp` row exists for this tenant, OR
 *   - the row is partial (any of host/port/username/password missing).
 *
 * The "all-or-nothing" gate is intentional: a tenant that filled in
 * only host but no password would silently fall back to platform SMTP,
 * which is exactly the behavior we want — rather than failing every
 * outbound mail with auth errors.
 *
 * Cached for TENANT_SMTP_TTL_MS. Invalidated via clearTenantEmailCache.
 */
export async function getTenantSmtpConfig(adminId: number | null | undefined): Promise<TenantSmtpConfig | null> {
  if (!adminId) return null

  const cached = smtpCache.get(adminId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.smtp
  }

  let smtp: TenantSmtpConfig | null = null
  try {
    const row = await prisma.setting.findFirst({
      where: { adminId, key: 'email.smtp' },
      select: { value: true },
    })
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value)
        const host = String(parsed?.host || '').trim()
        const username = String(parsed?.username || '').trim()
        const password = String(parsed?.password || '')
        const port = parseInt(String(parsed?.port || ''), 10)
        if (host && username && password && port > 0) {
          smtp = {
            host,
            port,
            username,
            password,
            secure: !!parsed?.secure,
          }
        }
      } catch {
        // Malformed JSON in Setting.value — treat as not configured.
      }
    }
  } catch (err) {
    console.error('[tenantSmtp] lookup failed for adminId', adminId, err)
  }

  smtpCache.set(adminId, { smtp, expiresAt: Date.now() + TENANT_SMTP_TTL_MS })
  return smtp
}

/**
 * Invalidate the sender + SMTP caches for a single tenant. Call from
 * the email-settings save endpoint so a freshly-saved config is picked
 * up by the next outbound mail without waiting for the 5-min TTL.
 */
export function clearTenantEmailCache(adminId: number | null | undefined): void {
  if (!adminId) return
  senderCache.delete(adminId)
  smtpCache.delete(adminId)
}

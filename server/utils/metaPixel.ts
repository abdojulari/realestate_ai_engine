/**
 * Meta (Facebook) Conversions API helper
 * ──────────────────────────────────────
 * Sends server-side events to Meta so conversions are still attributed when
 * the browser pixel is blocked (Safari ITP, ad-blockers, iOS ATT, etc.).
 *
 * Pairing with the browser pixel:
 *   1. Caller generates a stable `eventId` per business event.
 *   2. Browser fires `fbq('track', name, payload, { eventID })`.
 *   3. Server calls `sendMetaEvent({ eventId, ... })` with the SAME id.
 *   4. Meta dedupes by (event_name, event_id).
 *
 * Per-tenant resolution:
 *   • Tenant `metaPixelId` + `metaPixelAccessToken` (preferred — events go
 *     into the realtor's own Ad Account / Events Manager).
 *   • Falls back to platform-wide `NUXT_PUBLIC_META_PIXEL_ID` +
 *     `META_CAPI_ACCESS_TOKEN` env when the tenant has not configured one.
 *   • Returns silently (no throw) when neither is configured — calls are
 *     fire-and-forget by design so a missing token never breaks a lead form.
 *
 * Privacy:
 *   • All PII (email, phone, name, city, etc.) is SHA-256 hashed before
 *     leaving our server, per Meta's CAPI requirements. Raw values never
 *     hit the wire.
 *   • The IP and user-agent are passed through (Meta hashes those upstream).
 */

import { createHash } from 'node:crypto'
import { getRequestIP, getRequestHeader, type H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const GRAPH_API_VERSION = 'v19.0'

export type MetaEventName =
  | 'PageView'
  | 'Lead'
  | 'Subscribe'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'Contact'
  | 'Schedule'
  | 'SubmitApplication'

export interface MetaUserData {
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  country?: string | null
  /** Defaults to the H3 event's IP if available. Pass to override. */
  clientIp?: string | null
  /** Defaults to the H3 event's user-agent if available. Pass to override. */
  userAgent?: string | null
  /** _fbp browser cookie, if you have it. Improves attribution. */
  fbp?: string | null
  /** _fbc browser cookie or fbclid query, if available. Improves attribution. */
  fbc?: string | null
}

export interface MetaCustomData {
  /** USD/CAD/etc. */
  currency?: string
  /** Monetary value of the conversion. */
  value?: number
  /** Free-text label, e.g. property title or resource name. */
  contentName?: string
  /** Property type, lead form name, etc. */
  contentCategory?: string
  /** Array of stringly-typed identifiers (e.g. property IDs). */
  contentIds?: Array<string | number>
  /** Free-text status (e.g. inquiry status). */
  status?: string
}

export interface SendMetaEventOptions {
  /** Tenant whose pixel/token to use. Falls back to platform default if null. */
  adminId: number | null | undefined
  eventName: MetaEventName
  /**
   * Stable id used to dedupe with the browser pixel call. Generate ONCE
   * per business event and pass the same value to both. If omitted no
   * dedup is possible and the event will double-count when the browser
   * also fires.
   */
  eventId?: string
  /** Defaults to `now`. Pass a Date to backfill historical events. */
  eventTime?: Date
  /** URL the event is associated with. Defaults to the H3 referer header. */
  eventSourceUrl?: string
  /** Pass the H3 event so we can auto-fill IP/UA/referer/cookies. */
  event?: H3Event
  userData?: MetaUserData
  customData?: MetaCustomData
  /**
   * "website" | "email" | "phone_call" | "chat" | etc. — defaults to "website".
   */
  actionSource?: string
}

interface PixelConfig {
  pixelId: string
  accessToken: string
  /** "tenant" or "default" — useful for log diagnostics. */
  source: 'tenant' | 'default'
}

const tenantConfigCache = new Map<number, PixelConfig | null>()

/**
 * Resolve which pixel + token to use for a given tenant.
 * Tenant-scoped values win; otherwise we fall back to the platform-wide
 * env defaults (NUXT_PUBLIC_META_PIXEL_ID + META_CAPI_ACCESS_TOKEN).
 *
 * Returns null when neither is configured (event will be skipped).
 */
async function resolvePixelConfig(
  adminId: number | null | undefined
): Promise<PixelConfig | null> {
  // Tenant-specific config — prefer this so events land in the realtor's
  // own ad account.
  if (adminId != null) {
    if (tenantConfigCache.has(adminId)) {
      const cached = tenantConfigCache.get(adminId)
      if (cached) return cached
      // Cache miss-with-null: fall through and try the platform default.
    } else {
      try {
        const settings = await prisma.tenantSettings.findUnique({
          where: { adminId },
          select: { metaPixelId: true, metaPixelAccessToken: true },
        })
        if (settings?.metaPixelId && settings.metaPixelAccessToken) {
          const cfg: PixelConfig = {
            pixelId: settings.metaPixelId,
            accessToken: settings.metaPixelAccessToken,
            source: 'tenant',
          }
          tenantConfigCache.set(adminId, cfg)
          return cfg
        }
        // Cache the negative so we don't re-query Prisma every event.
        tenantConfigCache.set(adminId, null)
      } catch (err) {
        // Don't let a Prisma hiccup break the request — just skip CAPI.
        console.warn('[meta-capi] tenant settings lookup failed:', err)
      }
    }
  }

  // Platform-wide fallback.
  const defaultPixelId = process.env.NUXT_PUBLIC_META_PIXEL_ID || ''
  const defaultToken = process.env.META_CAPI_ACCESS_TOKEN || ''
  if (defaultPixelId && defaultToken) {
    return {
      pixelId: defaultPixelId,
      accessToken: defaultToken,
      source: 'default',
    }
  }

  return null
}

/**
 * Invalidate the tenant config cache for a given admin (call this from the
 * admin tenant-settings POST handler so a fresh pixel/token takes effect
 * immediately rather than on next process restart).
 */
export function invalidateMetaPixelCache(adminId?: number): void {
  if (adminId == null) {
    tenantConfigCache.clear()
  } else {
    tenantConfigCache.delete(adminId)
  }
}

function sha256(input: string | null | undefined): string | undefined {
  if (!input) return undefined
  const normalized = String(input).trim().toLowerCase()
  if (!normalized) return undefined
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Phone numbers must be E.164-ish before hashing per Meta CAPI guidance:
 * strip everything except digits.
 */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return undefined
  return createHash('sha256').update(digits).digest('hex')
}

function buildUserData(
  options: SendMetaEventOptions
): Record<string, unknown> {
  const u = options.userData || {}
  const event = options.event

  const clientIp =
    u.clientIp ?? (event ? getRequestIP(event, { xForwardedFor: true }) : null)
  const userAgent =
    u.userAgent ?? (event ? getRequestHeader(event, 'user-agent') : null)

  // Try to pull _fbp / _fbc from cookies if the caller didn't pass them.
  let fbp = u.fbp
  let fbc = u.fbc
  if (event && (!fbp || !fbc)) {
    const cookieHeader = getRequestHeader(event, 'cookie') || ''
    if (!fbp) {
      const m = cookieHeader.match(/(?:^|;\s*)_fbp=([^;]+)/)
      if (m && m[1]) fbp = decodeURIComponent(m[1])
    }
    if (!fbc) {
      const m = cookieHeader.match(/(?:^|;\s*)_fbc=([^;]+)/)
      if (m && m[1]) fbc = decodeURIComponent(m[1])
    }
  }

  const data: Record<string, unknown> = {}
  const em = sha256(u.email)
  const ph = hashPhone(u.phone)
  const fn = sha256(u.firstName)
  const ln = sha256(u.lastName)
  const ct = sha256(u.city)
  const st = sha256(u.province)
  const zp = sha256(u.postalCode)
  const country = sha256(u.country || 'CA')

  if (em) data.em = [em]
  if (ph) data.ph = [ph]
  if (fn) data.fn = [fn]
  if (ln) data.ln = [ln]
  if (ct) data.ct = [ct]
  if (st) data.st = [st]
  if (zp) data.zp = [zp]
  if (country) data.country = [country]
  if (clientIp) data.client_ip_address = clientIp
  if (userAgent) data.client_user_agent = userAgent
  if (fbp) data.fbp = fbp
  if (fbc) data.fbc = fbc

  return data
}

function buildCustomData(
  options: SendMetaEventOptions
): Record<string, unknown> | undefined {
  const c = options.customData
  if (!c) return undefined
  const data: Record<string, unknown> = {}
  if (c.currency) data.currency = c.currency
  if (typeof c.value === 'number' && Number.isFinite(c.value)) data.value = c.value
  if (c.contentName) data.content_name = c.contentName
  if (c.contentCategory) data.content_category = c.contentCategory
  if (c.contentIds && c.contentIds.length > 0) {
    data.content_ids = c.contentIds.map((v) => String(v))
  }
  if (c.status) data.status = c.status
  return Object.keys(data).length > 0 ? data : undefined
}

/**
 * Send a single event to the Meta Conversions API. Fire-and-forget — never
 * throws into the calling handler so a Meta outage cannot break a lead form.
 *
 * Returns:
 *   { ok: true, ... }  — accepted by Meta (events_received >= 1)
 *   { ok: false, ... } — silent skip (no config) or upstream failure
 */
export async function sendMetaEvent(
  options: SendMetaEventOptions
): Promise<{ ok: boolean; reason?: string; status?: number }> {
  try {
    const cfg = await resolvePixelConfig(options.adminId)
    if (!cfg) return { ok: false, reason: 'no-pixel-config' }

    const eventTime = Math.floor(
      (options.eventTime?.getTime() ?? Date.now()) / 1000
    )

    const eventSourceUrl =
      options.eventSourceUrl ||
      (options.event ? getRequestHeader(options.event, 'referer') || undefined : undefined)

    const eventPayload: Record<string, unknown> = {
      event_name: options.eventName,
      event_time: eventTime,
      action_source: options.actionSource || 'website',
      user_data: buildUserData(options),
    }
    if (options.eventId) eventPayload.event_id = options.eventId
    if (eventSourceUrl) eventPayload.event_source_url = eventSourceUrl
    const customData = buildCustomData(options)
    if (customData) eventPayload.custom_data = customData

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.accessToken)}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventPayload] }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(
        `[meta-capi] ${options.eventName} failed (${cfg.source} pixel ${cfg.pixelId}, ${res.status}):`,
        text.slice(0, 500)
      )
      return { ok: false, reason: 'http-error', status: res.status }
    }

    return { ok: true, status: res.status }
  } catch (err) {
    console.warn('[meta-capi] send error:', err)
    return { ok: false, reason: 'exception' }
  }
}

/**
 * Convenience wrapper — generates a UUID-shaped eventId so callers don't
 * have to import crypto themselves. Use this when you DON'T also want the
 * browser to fire the same event (no dedup needed).
 */
export function newMetaEventId(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 32)
}

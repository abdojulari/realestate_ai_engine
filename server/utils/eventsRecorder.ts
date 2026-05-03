/**
 * Server-side event recorder.
 *
 * Two entry points:
 *   • `recordEventFromBrowser(event, body)`  – called by `/api/events.post`
 *     after parsing/sanitizing the request. Resolves visitor + session
 *     from cookies, persists EventLog, enqueues for the worker.
 *
 *   • `recordServerEvent(event, payload)`    – trusted server emitters
 *     (form submit handlers, document opens, etc.) that already know
 *     the email + adminId. Skips visitor/session lookup if not provided.
 *
 * Both are best-effort — failures are logged and swallowed so the
 * caller's primary work (creating an inquiry, sending an email…) is
 * never blocked by the analytics pipeline.
 */
import { H3Event, getCookie, setCookie, getHeader, getRequestIP } from 'h3'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from './tenant'
import { COOKIE_VID, COOKIE_SID, SESSION_IDLE_MINUTES } from './eventConstants'
import { enqueueEvent, type EventJobPayload } from './eventsQueue'
import { processEventInline } from './eventsWorker'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const VID_TTL_DAYS = 365
const SID_TTL_MINUTES = SESSION_IDLE_MINUTES

function newId(): string {
  // 22-char URL-safe id; collision-resistant enough for cookies.
  return crypto.randomBytes(16).toString('base64url')
}

/** Read or mint the visitor cookie, persisting it to the response. */
function ensureVisitorCookie(event: H3Event): string {
  const existing = getCookie(event, COOKIE_VID)
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing
  const fresh = newId()
  setCookie(event, COOKIE_VID, fresh, {
    httpOnly: false, // browser pixel reads it for hybrid attribution
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * VID_TTL_DAYS,
  })
  return fresh
}

function ensureSessionCookie(event: H3Event): string {
  const existing = getCookie(event, COOKIE_SID)
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing
  const fresh = newId()
  setCookie(event, COOKIE_SID, fresh, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * SID_TTL_MINUTES,
  })
  return fresh
}

interface UpsertVisitorInput {
  vid: string
  adminId: number | null
  ip?: string | null
  userAgent?: string | null
  referrer?: string | null
  landingPath?: string | null
  utm?: {
    source?: string | null
    medium?: string | null
    campaign?: string | null
    term?: string | null
    content?: string | null
  }
}

/**
 * Idempotent visitor upsert. First-touch attribution: utm fields are
 * only written on row creation, never overwritten on a return visit
 * (so we can attribute lifetime value to the original campaign).
 */
async function upsertVisitor(input: UpsertVisitorInput) {
  const { vid, adminId, ip, userAgent, referrer, landingPath, utm } = input
  const now = new Date()
  const existing = await prisma.visitor.findUnique({ where: { vid } })
  if (existing) {
    // Touch only — preserves first-touch attribution.
    return prisma.visitor.update({
      where: { id: existing.id },
      data: { lastSeenAt: now, adminId: existing.adminId ?? adminId },
    })
  }
  return prisma.visitor.create({
    data: {
      vid,
      adminId: adminId ?? undefined,
      ipAddress: ip || undefined,
      userAgent: userAgent || undefined,
      referrer: referrer || undefined,
      landingPath: landingPath || undefined,
      utmSource: utm?.source || undefined,
      utmMedium: utm?.medium || undefined,
      utmCampaign: utm?.campaign || undefined,
      utmTerm: utm?.term || undefined,
      utmContent: utm?.content || undefined,
      firstSeenAt: now,
      lastSeenAt: now,
    },
  })
}

/**
 * Find or create the session row matching the cookie. Last-touch UTM
 * lives here (visitor table holds first-touch).
 */
async function upsertSession(input: {
  sid: string
  visitorId: number
  adminId: number | null
  referrer?: string | null
  landingPath?: string | null
  utm?: UpsertVisitorInput['utm']
}) {
  const { sid, visitorId, adminId, referrer, landingPath, utm } = input
  const existing = await prisma.session.findUnique({ where: { sid } })
  if (existing) {
    return prisma.session.update({
      where: { id: existing.id },
      data: { eventCount: { increment: 1 } },
    })
  }
  return prisma.session.create({
    data: {
      sid,
      visitorId,
      adminId: adminId ?? undefined,
      referrer: referrer || undefined,
      landingPath: landingPath || undefined,
      utmSource: utm?.source || undefined,
      utmMedium: utm?.medium || undefined,
      utmCampaign: utm?.campaign || undefined,
      eventCount: 1,
    },
  })
}

export interface BrowserEventBody {
  name: string
  properties?: Record<string, unknown> | null
  objectType?: string | null
  objectId?: number | null
  email?: string | null
  path?: string | null
  referrer?: string | null
  utm?: {
    source?: string | null
    medium?: string | null
    campaign?: string | null
    term?: string | null
    content?: string | null
  }
}

const NAME_RX = /^[a-z][a-z0-9_]{1,63}$/

function clientIp(event: H3Event): string | null {
  try {
    return getRequestIP(event, { xForwardedFor: true }) || null
  } catch {
    return null
  }
}

/**
 * Persist a browser-emitted event + enqueue for worker processing.
 * Returns visitorId/sessionId so the caller can echo them back to the
 * browser (purely informational; the cookies stay authoritative).
 */
export async function recordEventFromBrowser(
  event: H3Event,
  body: BrowserEventBody
): Promise<{ ok: boolean; visitorId?: number; sessionId?: number; eventLogId?: string }> {
  if (!body || typeof body.name !== 'string') return { ok: false }
  const name = body.name.trim().toLowerCase()
  if (!NAME_RX.test(name)) return { ok: false }

  const adminId = await resolveTenantFromRequest(event).catch(() => null)
  const vid = ensureVisitorCookie(event)
  const sid = ensureSessionCookie(event)

  const ip = clientIp(event)
  const userAgent = getHeader(event, 'user-agent') || null
  const referrer = body.referrer || getHeader(event, 'referer') || null

  let visitor: { id: number } | null = null
  let session: { id: number } | null = null
  try {
    visitor = await upsertVisitor({
      vid,
      adminId,
      ip,
      userAgent,
      referrer,
      landingPath: body.path || null,
      utm: body.utm,
    })
    session = await upsertSession({
      sid,
      visitorId: visitor.id,
      adminId,
      referrer,
      landingPath: body.path || null,
      utm: body.utm,
    })
  } catch (err) {
    console.error('[eventsRecorder] visitor/session upsert failed', err)
  }

  let eventLogId: bigint | null = null
  try {
    const row = await prisma.eventLog.create({
      data: {
        adminId: adminId ?? undefined,
        visitorId: visitor?.id,
        sessionId: session?.id,
        name,
        objectType: body.objectType || undefined,
        objectId: body.objectId ?? undefined,
        properties: body.properties ? (body.properties as any) : undefined,
        email: body.email ? body.email.trim().toLowerCase() : undefined,
        path: body.path || undefined,
        referrer: referrer || undefined,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
      },
      select: { id: true },
    })
    eventLogId = row.id
  } catch (err) {
    console.error('[eventsRecorder] eventLog insert failed', err)
    return { ok: false, visitorId: visitor?.id, sessionId: session?.id }
  }

  const payload: EventJobPayload = {
    eventLogId: eventLogId.toString(),
    adminId,
    visitorId: visitor?.id ?? null,
    sessionId: session?.id ?? null,
    email: body.email?.trim().toLowerCase() || null,
    name,
    objectType: body.objectType || null,
    objectId: body.objectId ?? null,
    properties: body.properties || null,
    createdAt: new Date().toISOString(),
  }

  const queued = await enqueueEvent(payload)
  if (!queued) {
    // Fall back to inline processing so single-instance dev still works.
    void processEventInline(payload).catch((err) =>
      console.error('[eventsRecorder] inline worker failed', err)
    )
  }

  return {
    ok: true,
    visitorId: visitor?.id,
    sessionId: session?.id,
    eventLogId: eventLogId.toString(),
  }
}

/**
 * Trusted server-side event emitter. Use from form-submission handlers
 * (inquiry, contact, estimate, …) where the email is already validated
 * and the adminId already resolved.
 */
export async function recordServerEvent(
  event: H3Event | null,
  payload: {
    adminId: number | null
    name: string
    email?: string | null
    objectType?: string | null
    objectId?: number | null
    properties?: Record<string, unknown> | null
  }
): Promise<void> {
  const name = payload.name.trim().toLowerCase()
  if (!NAME_RX.test(name)) return

  let visitorId: number | null = null
  let sessionId: number | null = null

  if (event) {
    const vid = getCookie(event, COOKIE_VID)
    const sid = getCookie(event, COOKIE_SID)
    if (vid) {
      const v = await prisma.visitor.findUnique({
        where: { vid },
        select: { id: true },
      })
      visitorId = v?.id ?? null
    }
    if (sid) {
      const s = await prisma.session.findUnique({
        where: { sid },
        select: { id: true },
      })
      sessionId = s?.id ?? null
    }
  }

  let eventLogId: bigint | null = null
  try {
    const row = await prisma.eventLog.create({
      data: {
        adminId: payload.adminId ?? undefined,
        visitorId: visitorId ?? undefined,
        sessionId: sessionId ?? undefined,
        name,
        objectType: payload.objectType || undefined,
        objectId: payload.objectId ?? undefined,
        properties: payload.properties ? (payload.properties as any) : undefined,
        email: payload.email ? payload.email.trim().toLowerCase() : undefined,
      },
      select: { id: true },
    })
    eventLogId = row.id
  } catch (err) {
    console.error('[eventsRecorder] server event insert failed', err)
    return
  }

  const job: EventJobPayload = {
    eventLogId: eventLogId.toString(),
    adminId: payload.adminId,
    visitorId,
    sessionId,
    email: payload.email?.trim().toLowerCase() || null,
    name,
    objectType: payload.objectType || null,
    objectId: payload.objectId ?? null,
    properties: payload.properties || null,
    createdAt: new Date().toISOString(),
  }

  const queued = await enqueueEvent(job)
  if (!queued) {
    void processEventInline(job).catch((err) =>
      console.error('[eventsRecorder] inline worker failed (server)', err)
    )
  }
}

import {
  defineEventHandler,
  getRouterParam,
  readBody,
  createError,
  getRequestIP,
  getRequestHeader,
} from 'h3'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../../../utils/email'
import { hashIp, getSiteBaseUrl, type InterestKind } from '../../../utils/instaConnect'
import { sendMetaEvent, newMetaEventId } from '../../../utils/metaPixel'
import { recordServerEvent } from '../../../utils/eventsRecorder'
import { EVENT_NAMES } from '../../../utils/eventConstants'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface CaptureBody {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  message?: string
  interest?: InterestKind | string
  consent?: boolean
  /** Optional Meta Pixel dedup id from the browser. */
  _metaEventId?: string
}

const VALID_INTERESTS = new Set<InterestKind>(['buying', 'selling', 'renting', 'connecting'])

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default defineEventHandler(async (event) => {
  const slug = (getRouterParam(event, 'slug') || '').trim().toLowerCase()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const body = (await readBody<CaptureBody>(event)) || {}
  const firstName = (body.firstName || '').trim()
  const lastName = (body.lastName || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const phone = (body.phone || '').trim()
  const company = (body.company || '').trim() || null
  const message = (body.message || '').trim() || null
  const consent = body.consent === true
  const interest =
    typeof body.interest === 'string' && VALID_INTERESTS.has(body.interest as InterestKind)
      ? (body.interest as InterestKind)
      : null

  if (!firstName) throw createError({ statusCode: 400, statusMessage: 'First name is required' })
  if (!lastName) throw createError({ statusCode: 400, statusMessage: 'Last name is required' })
  if (!email || !isEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email is required' })
  }
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Phone is required' })
  if (!consent) {
    throw createError({ statusCode: 400, statusMessage: 'You must agree to be contacted' })
  }

  const agent = await prisma.user.findFirst({
    where: { instaConnectSlug: slug, instaConnectEnabled: true },
    select: { id: true, role: true, adminId: true, firstName: true, lastName: true, email: true },
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'InstaConnect card not found' })
  }

  const tenantAdminId = agent.role === 'user' ? agent.adminId : agent.id
  if (!tenantAdminId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent has no tenant configured' })
  }

  const userAgent = getRequestHeader(event, 'user-agent') || null
  const referrer = getRequestHeader(event, 'referer') || null
  const ip = getRequestIP(event, { xForwardedFor: true })
  const ipHash = await hashIp(ip)

  const capture = await prisma.instaConnectCapture.create({
    data: {
      adminId: tenantAdminId,
      firstName,
      lastName,
      email,
      phone,
      company,
      interest,
      message,
      consent,
      status: 'pending',
      userAgent,
      ipHash,
      referrer,
    },
  })

  // Email the agent. Don't fail the capture if SMTP is down.
  try {
    const baseUrl = getSiteBaseUrl(event)
    const reviewUrl = baseUrl
      ? `${baseUrl}/admin/lead-generation?tab=instaconnect`
      : '/admin/lead-generation?tab=instaconnect'

    const interestLine = interest
      ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B;">Interest</td><td style="padding:6px 0;color:#0F172A;font-weight:600;">${escapeHtml(interest)}</td></tr>`
      : ''
    const companyLine = company
      ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B;">Company</td><td style="padding:6px 0;color:#0F172A;font-weight:600;">${escapeHtml(company)}</td></tr>`
      : ''
    const messageBlock = message
      ? `<div style="margin-top:18px;padding:14px 16px;background:#F8FAFC;border-radius:10px;color:#334155;line-height:1.55;">${escapeHtml(message)}</div>`
      : ''

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;">
  <div style="background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);padding:22px 26px;border-radius:14px 14px 0 0;color:#fff;">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.75;">InstaConnect</div>
    <h2 style="margin:6px 0 0;font-size:20px;">New contact captured via your QR card</h2>
  </div>
  <div style="background:#fff;padding:22px 26px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 14px 14px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;width:90px;">Name</td><td style="padding:6px 0;color:#0F172A;font-weight:600;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}" style="color:#1D4ED8;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Phone</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(phone)}" style="color:#1D4ED8;">${escapeHtml(phone)}</a></td></tr>
      ${companyLine}
      ${interestLine}
    </table>
    ${messageBlock}
    <div style="margin-top:22px;display:flex;gap:10px;">
      <a href="${reviewUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:600;">Review &amp; promote to CRM</a>
    </div>
    <p style="margin-top:18px;font-size:12px;color:#94A3B8;">Capture #${capture.id} • Pending review</p>
  </div>
</div>`.trim()

    const recipient =
      agent.email || process.env.AGENT_EMAIL || process.env.SMTP_SENDER || ''
    if (recipient) {
      await sendEmail({
        to: recipient,
        subject: `New InstaConnect contact: ${firstName} ${lastName}`,
        html,
      })
    }
  } catch (e) {
    console.error('[instaConnect.capture] email send failed', e)
  }

  // Meta CAPI Lead — InstaConnect QR captures are some of the highest-
  // intent leads (the prospect already scanned a physical card).
  const metaEventId = body._metaEventId || newMetaEventId()
  void sendMetaEvent({
    adminId: tenantAdminId,
    eventName: 'Lead',
    eventId: metaEventId,
    event,
    userData: {
      email,
      phone,
      firstName,
      lastName,
    },
    customData: {
      contentName: 'InstaConnect',
      contentCategory: 'instaconnect',
      contentIds: [capture.id],
      ...(interest ? { status: interest } : {}),
    },
  })

  void recordServerEvent(event, {
    adminId: tenantAdminId,
    name: EVENT_NAMES.LEAD_CREATED,
    email: email,
    objectType: 'instaconnect',
    objectId: capture.id,
    properties: {
      formName: 'instaconnect',
      firstName,
      lastName,
      interest: interest || null,
    },
  })

  return {
    success: true,
    captureId: capture.id,
    vcardUrl: `/api/insta-connect/${encodeURIComponent(slug)}/vcard`,
    message: `Thanks, ${firstName}! ${agent.firstName || 'The agent'} will be in touch shortly.`,
    _metaEventId: metaEventId,
  }
})

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

import { defineEventHandler, readBody, createError } from 'h3'
import { resolveTenantFromRequest } from '../utils/tenant'
import { upsertCrmClientFromPlatformContact } from '../utils/crmClientSync'
import { sendEmail, isValidEmail } from '../utils/email'
import { getTenantSiteUrlForEvent } from '../utils/tenantSiteUrl'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    firstName: string
    lastName: string
    email: string
    phone?: string
    message: string
  }>(event)

  if (!body || !body.firstName || !body.lastName || !body.email || !body.message) {
    throw createError({ statusCode: 400, statusMessage: 'First name, last name, email, and message are required.' })
  }
  if (!isValidEmail(body.email)) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide a valid email address.' })
  }
  if (body.message.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Message is too long (max 5,000 characters).' })
  }

  const adminId = await resolveTenantFromRequest(event)

  let lead: { id: number; email: string; phone: string | null } | null = null
  try {
    lead = await prisma.chatLead.create({
      data: {
        name: `${body.firstName} ${body.lastName}`.trim(),
        email: body.email,
        phone: body.phone || null,
        message: body.message,
        source: 'contact_form',
        status: 'new',
        ...(adminId ? { adminId } : {}),
      },
      select: { id: true, email: true, phone: true },
    })
    if (adminId) {
      await upsertCrmClientFromPlatformContact(prisma, {
        adminId,
        email: lead.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: lead.phone,
        source: 'contact_form',
        sourceId: lead.id,
      })
    }
  } catch (err) {
    console.error('[contact] failed to save lead:', err)
    // Lead capture failure should not stop the email — better to deliver the
    // inquiry than lose it because Prisma had a hiccup.
  }

  // Find the tenant admin's inbox so the inquiry actually reaches the realtor
  // who owns this subdomain — NOT the global SMTP relay account.
  let tenantAdmin: { email: string; firstName: string | null; lastName: string | null } | null = null
  if (adminId) {
    tenantAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, firstName: true, lastName: true },
    })
  }

  const recipients: string[] = []
  if (tenantAdmin?.email) recipients.push(tenantAdmin.email)
  // Fallback only if we couldn't resolve a tenant — keeps single-tenant /
  // local-dev installs working.
  if (recipients.length === 0 && process.env.SMTP_USERNAME) {
    recipients.push(process.env.SMTP_USERNAME)
  }

  if (recipients.length === 0) {
    console.warn('[contact] no recipients resolved — email skipped (lead saved if DB was up)')
    return { ok: true, leadId: lead?.id ?? null, emailed: false }
  }

  const greetingName = tenantAdmin?.firstName?.trim() || 'there'
  const fullName = `${body.firstName} ${body.lastName}`.trim()
  const phoneLine = body.phone ? `<p><strong>Phone:</strong> <a href="tel:${escapeHtml(body.phone)}">${escapeHtml(body.phone)}</a></p>` : ''
  const tenantSiteUrl = await getTenantSiteUrlForEvent(event, adminId)
  const inboxUrl = tenantSiteUrl ? `${tenantSiteUrl}/admin/leads` : ''

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 28px; border-radius: 12px 12px 0 0;">
        <div style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.7;">New website inquiry</div>
        <h2 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">${escapeHtml(fullName)} just contacted you</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
        <p style="margin-top: 0;">Hi ${escapeHtml(greetingName)},</p>
        <p>You received a new inquiry through your website's contact form.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 90px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(body.email)}" style="color: #1976d2; text-decoration: none;">${escapeHtml(body.email)}</a></td></tr>
          ${body.phone ? `<tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(body.phone)}" style="color: #1976d2; text-decoration: none;">${escapeHtml(body.phone)}</a></td></tr>` : ''}
        </table>
        <div style="background: #f9fafb; border-left: 3px solid #1e293b; padding: 14px 18px; border-radius: 4px; margin: 16px 0;">
          <div style="color: #6b7280; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">Message</div>
          <div style="white-space: pre-wrap;">${escapeHtml(body.message)}</div>
        </div>
        ${inboxUrl ? `<p style="margin-top: 24px;"><a href="${inboxUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 600;">Open in CRM</a></p>` : ''}
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Reply directly to this email to respond to ${escapeHtml(fullName)}.</p>
      </div>
    </div>
  `

  const text = `New website inquiry\n\nName: ${fullName}\nEmail: ${body.email}\n${body.phone ? `Phone: ${body.phone}\n` : ''}\nMessage:\n${body.message}\n${inboxUrl ? `\nOpen in CRM: ${inboxUrl}\n` : ''}`

  const sent = await sendEmail({
    to: recipients,
    subject: `New website inquiry — ${fullName}`,
    html,
    text,
    from: process.env.SMTP_SENDER || process.env.SMTP_USERNAME,
    replyTo: body.email,
  })

  return { ok: true, leadId: lead?.id ?? null, emailed: sent }
})

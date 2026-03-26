import { sendEmail, generateEmailTemplate } from '../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

const VALID_REQUEST_TYPES = ['access', 'correction', 'deletion', 'withdraw_consent', 'restrict', 'other']

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Access My Data',
  correction: 'Correct My Data',
  deletion: 'Delete My Data',
  withdraw_consent: 'Withdraw Consent',
  restrict: 'Restrict Processing',
  other: 'Other Privacy Inquiry',
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { fullName, email, phone, requestType, details } = body

  if (!fullName || !email || !requestType || !details) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  if (!VALID_REQUEST_TYPES.includes(requestType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request type' })
  }

  const ipAddress = getHeader(event, 'x-forwarded-for')
    || getHeader(event, 'x-real-ip')
    || 'unknown'

  const privacyRequest = await prisma.privacyRequest.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      requestType,
      details,
      ipAddress,
    },
  })

  const typeLabel = REQUEST_TYPE_LABELS[requestType] || requestType

  // Send confirmation email to the requester
  try {
    const confirmationHtml = generateEmailTemplate(`
      <p>Hello ${fullName},</p>
      <p>We have received your privacy request. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;width:40%;">Request Type</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Reference #</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">PR-${String(privacyRequest.id).padStart(5, '0')}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Submitted</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
      </table>
      <p>Under PIPEDA, we are required to respond to your request within <strong>30 calendar days</strong>. 
      Our Privacy Officer will review your request and may contact you if additional verification is needed.</p>
      <p>If you have any questions, please contact our Privacy Officer at abdulkabirojulari@gmail.com.</p>
    `, {
      title: 'Privacy Request Confirmation',
      footerText: 'This is an automated confirmation of your privacy request under PIPEDA.',
    })

    await sendEmail({
      to: email,
      subject: `Privacy Request Received — Reference PR-${String(privacyRequest.id).padStart(5, '0')}`,
      html: confirmationHtml,
    })
  } catch (err) {
    console.error('Failed to send confirmation email:', err)
  }

  // Notify the Privacy Officer
  try {
    const notifyHtml = generateEmailTemplate(`
      <p><strong>New PIPEDA Privacy Request</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;width:40%;">Reference</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">PR-${String(privacyRequest.id).padStart(5, '0')}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Name</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${fullName}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Email</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${email}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Phone</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${phone || 'N/A'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">Type</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;">IP Address</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${ipAddress}</td></tr>
      </table>
      <p><strong>Details:</strong></p>
      <div style="background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;margin:12px 0;">${details.replace(/\n/g, '<br>')}</div>
      <p style="color:#666;font-size:13px;">PIPEDA requires a response within 30 calendar days.</p>
    `, {
      title: 'New Privacy Request — Action Required',
      footerText: 'PIPEDA Privacy Request Notification — DeelBot',
    })

    await sendEmail({
      to: 'abdulkabirojulari@gmail.com',
      subject: `[PIPEDA] New Privacy Request PR-${String(privacyRequest.id).padStart(5, '0')} — ${typeLabel}`,
      html: notifyHtml,
    })
  } catch (err) {
    console.error('Failed to send Privacy Officer notification:', err)
  }

  return { success: true, reference: `PR-${String(privacyRequest.id).padStart(5, '0')}` }
})

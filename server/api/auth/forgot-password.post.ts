import { defineEventHandler, readBody, createError, getRequestIP, getRequestHeader } from 'h3'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { assertLoginEmail } from '../../utils/authInputValidation'
import { verifyTurnstileToken } from '../../utils/turnstile'
import { sendEmail } from '../../utils/email'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const RESET_TTL_MS = 30 * 60 * 1000 // 30 minutes

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function buildResetUrl(event: any, secret: string): string {
  const config = useRuntimeConfig(event)
  const configured = (config.public?.siteUrl as string) || ''
  const proto = (event.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
  const host = event.headers.get('x-forwarded-host') || event.headers.get('host') || ''
  const origin = (configured || (host ? `${proto}://${host}` : '')).replace(/\/$/, '')
  return `${origin}/auth/reset-password?token=${encodeURIComponent(secret)}`
}

function buildEmail(opts: { firstName: string | null; resetUrl: string }) {
  const { firstName, resetUrl } = opts
  const safeName = firstName?.trim() || 'there'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Reset your DeelBot password</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f6f7fb;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:40px 40px 32px 40px;text-align:center;color:#ffffff;">
                  <div style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;opacity:0.7;margin-bottom:14px;">DeelBot Security</div>
                  <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.02em;">Reset your password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px 8px 40px;font-size:16px;line-height:1.6;">
                  <p style="margin:0 0 16px 0;">Hi <strong>${safeName}</strong>,</p>
                  <p style="margin:0 0 16px 0;">We received a request to reset the password on your DeelBot account. Click the button below to choose a new password. This link will expire in <strong>30 minutes</strong>.</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:24px 40px 8px 40px;">
                  <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:999px;font-size:15px;letter-spacing:0.02em;">Reset Password</a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 40px 0 40px;font-size:13px;color:#64748b;line-height:1.6;">
                  <p style="margin:0 0 8px 0;">Or copy &amp; paste this URL into your browser:</p>
                  <p style="margin:0;word-break:break-all;color:#334155;"><a href="${resetUrl}" style="color:#334155;">${resetUrl}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 40px 40px 40px;font-size:13px;color:#64748b;line-height:1.6;">
                  <p style="margin:0 0 6px 0;"><strong>Didn't request this?</strong> You can safely ignore this email — your password will stay the same.</p>
                  <p style="margin:0;">For your security, never share this link with anyone.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                  © ${new Date().getFullYear()} DeelBot · <a href="https://deelbot.com" style="color:#94a3b8;">deelbot.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
  const text = `Hi ${safeName},

We received a request to reset the password on your DeelBot account. Use the link below to choose a new password (it expires in 30 minutes):

${resetUrl}

If you didn't request this, you can safely ignore this email.

— DeelBot Security`
  return { html, text }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = assertLoginEmail(body?.email)
    await verifyTurnstileToken(event, body?.turnstileToken)

    // Always answer with the same success payload regardless of whether the address exists,
    // so the endpoint cannot be used to enumerate registered users.
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, password: true, adminId: true },
    })

    // Skip silently for unknown / OAuth-only accounts (no password to reset).
    if (!user || !user.password) {
      return genericResponse
    }

    const secret = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256(secret)
    const expiry = new Date(Date.now() + RESET_TTL_MS)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetTokenExpiry: expiry,
      },
    })

    const resetUrl = buildResetUrl(event, secret)
    const { html, text } = buildEmail({ firstName: user.firstName ?? null, resetUrl })

    const sent = await sendEmail({
      to: user.email,
      subject: 'Reset your DeelBot password',
      html,
      text,
      adminId: user.adminId ?? null,
    })

    if (!sent) {
      console.error(`[auth/forgot-password] SMTP failed for ${user.email}`)
      throw createError({
        statusCode: 503,
        statusMessage: 'Could not send reset email. Please try again later.',
      })
    }

    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'password_reset_requested',
          description: 'Password reset link emailed',
          ipAddress: getRequestIP(event),
          userAgent: getRequestHeader(event, 'user-agent'),
        },
      })
    } catch {
      // Best-effort audit log; do not fail the response if it errors.
    }

    return genericResponse
  } catch (error: unknown) {
    const e = error as { statusCode?: number; statusMessage?: string; message?: string }
    if (typeof e?.statusCode === 'number') {
      throw error
    }
    console.error('[auth/forgot-password] unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: e?.message || 'Failed to process password reset request',
    })
  }
})
